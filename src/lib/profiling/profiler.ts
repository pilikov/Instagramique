import { randomUUID } from "crypto";
import type {
  FollowerRawPayload,
  FollowerProfile,
  ProfileRun,
  ContentMeta,
  LLMProvider,
} from "./types";
import { extractSignals } from "./extractors";
import {
  inferInterests,
  inferSegments,
  inferIntent,
  inferCommercial,
  inferGeo,
  computeConfidenceScores,
  computeSourceCompleteness,
} from "./inference";
import {
  upsertProfile,
  upsertProfiles,
  getProfileByUsername,
  createRun,
  updateRun,
} from "./store";

export interface ProfileResult {
  profile: FollowerProfile;
  isNew: boolean;
  processingTimeMs: number;
}

export interface BatchResult {
  run: ProfileRun;
  results: ProfileResult[];
}

/**
 * Profile a single follower from raw data.
 * Pure function that builds the FollowerProfile — does not persist.
 */
export function buildProfile(raw: FollowerRawPayload): FollowerProfile {
  const signals = extractSignals(raw);

  const interests = inferInterests(raw, signals);
  const segments = inferSegments(raw, signals);
  const intent = inferIntent(raw, signals);
  const commercial = inferCommercial(raw, signals);
  const geo = inferGeo(raw, signals);

  const confidenceScores = computeConfidenceScores({
    inferred_interests: interests,
    inferred_segments: segments,
    inferred_intent: intent,
    inferred_commercial: commercial,
    inferred_geo: geo,
  });

  const completeness = computeSourceCompleteness(raw);
  const now = new Date().toISOString();

  const recentContentMeta: ContentMeta[] = (raw.recent_media_urls || []).map((url, i) => ({
    url,
    type: "unknown",
    timestamp: undefined,
    likes: undefined,
    comments: undefined,
  }));

  return {
    id: `ig_${raw.username.toLowerCase()}`,
    platform: "instagram",
    account_id: raw.username,
    username: raw.username,
    display_name: raw.full_name || raw.username,
    bio: raw.bio || "",
    external_url: raw.external_url || "",
    category: raw.category || "",
    account_type: raw.account_type || "",
    profile_picture_url: raw.profile_picture_url || "",
    profile_stats: {
      followers_count: raw.followers_count,
      follows_count: raw.follows_count,
      media_count: raw.media_count,
      follower_following_ratio:
        raw.followers_count && raw.follows_count && raw.follows_count > 0
          ? Math.round((raw.followers_count / raw.follows_count) * 100) / 100
          : undefined,
    },
    recent_content_text: raw.recent_captions || [],
    recent_content_meta: recentContentMeta,
    detected_language: signals.detected_language,
    extracted_keywords: signals.keywords,
    extracted_hashtags: signals.hashtags,
    extracted_emojis: signals.emojis,
    inferred_interests: interests,
    inferred_segments: segments,
    inferred_profession: segments.slice(0, 3),
    inferred_intent: intent,
    inferred_commercial: commercial,
    inferred_geo: geo,
    confidence_scores: confidenceScores,
    source_completeness_score: completeness,
    last_profiled_at: now,
    created_at: now,
    updated_at: now,
    profile_version: 1,
    raw_payload: raw,
  };
}

/**
 * Profile a single follower and persist.
 */
export async function profileOne(
  raw: FollowerRawPayload,
  llm?: LLMProvider
): Promise<ProfileResult> {
  const start = Date.now();

  let profile = buildProfile(raw);

  if (llm) {
    try {
      const enrichment = await llm.enrich(profile);
      if (enrichment.interests) {
        profile.inferred_interests = mergeInferenceTags(
          profile.inferred_interests,
          enrichment.interests
        );
      }
      if (enrichment.segments) {
        profile.inferred_segments = mergeInferenceTags(
          profile.inferred_segments,
          enrichment.segments
        );
      }
    } catch (err) {
      console.warn(`[profiler] LLM enrichment failed for ${raw.username}:`, err);
    }
  }

  const existing = await getProfileByUsername(raw.username);
  const isNew = !existing;

  if (existing) {
    profile.id = existing.id;
    profile.created_at = existing.created_at;
    profile.profile_version = existing.profile_version + 1;
  }

  profile = await upsertProfile(profile);

  return {
    profile,
    isNew,
    processingTimeMs: Date.now() - start,
  };
}

/**
 * Batch-profile multiple followers.
 */
export async function profileBatch(
  rawProfiles: FollowerRawPayload[],
  llm?: LLMProvider
): Promise<BatchResult> {
  const runId = randomUUID();
  const run: ProfileRun = {
    id: runId,
    started_at: new Date().toISOString(),
    status: "running",
    total_profiles: rawProfiles.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };
  await createRun(run);

  const results: ProfileResult[] = [];
  const builtProfiles: FollowerProfile[] = [];

  for (const raw of rawProfiles) {
    try {
      const start = Date.now();
      let profile = buildProfile(raw);

      if (llm) {
        try {
          const enrichment = await llm.enrich(profile);
          if (enrichment.interests) {
            profile.inferred_interests = mergeInferenceTags(
              profile.inferred_interests,
              enrichment.interests
            );
          }
        } catch {
          // LLM failure is non-fatal in batch mode
        }
      }

      builtProfiles.push(profile);
      results.push({ profile, isNew: true, processingTimeMs: Date.now() - start });
      run.succeeded++;
    } catch (err) {
      run.failed++;
      run.errors.push({
        username: raw.username || "unknown",
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }
    run.processed++;
  }

  if (builtProfiles.length > 0) {
    await upsertProfiles(builtProfiles);
  }

  run.status = "completed";
  run.finished_at = new Date().toISOString();
  await updateRun(run);

  return { run, results };
}

/**
 * Convert business_discovery API response to FollowerRawPayload.
 */
export function businessDiscoveryToRaw(data: Record<string, unknown>): FollowerRawPayload {
  const media = data.media as { data?: Array<{ caption?: string; media_url?: string }> } | undefined;

  return {
    username: (data.username as string) || "",
    full_name: (data.name as string) || "",
    bio: (data.biography as string) || "",
    external_url: (data.website as string) || "",
    profile_picture_url: (data.profile_picture_url as string) || "",
    followers_count: data.followers_count as number | undefined,
    follows_count: data.follows_count as number | undefined,
    media_count: data.media_count as number | undefined,
    recent_captions: media?.data?.map((m) => m.caption || "").filter(Boolean).slice(0, 10) || [],
    recent_media_urls: media?.data?.map((m) => m.media_url || "").filter(Boolean).slice(0, 10) || [],
  };
}

function mergeInferenceTags(
  existing: { tag: string; confidence: number; evidence: string[]; source_fields: string[] }[],
  incoming: { tag: string; confidence: number; evidence: string[]; source_fields: string[] }[]
): { tag: string; confidence: number; evidence: string[]; source_fields: string[] }[] {
  const map = new Map(existing.map((t) => [t.tag, { ...t }]));

  for (const tag of incoming) {
    const ex = map.get(tag.tag);
    if (ex) {
      ex.confidence = Math.min(1, (ex.confidence + tag.confidence) / 2 + 0.1);
      ex.evidence = [...new Set([...ex.evidence, ...tag.evidence])];
      ex.source_fields = [...new Set([...ex.source_fields, ...tag.source_fields])];
    } else {
      map.set(tag.tag, { ...tag, source_fields: [...tag.source_fields] });
    }
  }

  return [...map.values()].sort((a, b) => b.confidence - a.confidence);
}
