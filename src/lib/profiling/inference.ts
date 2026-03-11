import type {
  FollowerRawPayload,
  ExtractedSignals,
  InferenceTag,
  ConfidenceScores,
} from "./types";
import {
  INTEREST_KEYWORDS,
  SEGMENT_KEYWORDS,
  INTENT_SIGNALS,
  COMMERCIAL_SIGNALS,
  GEO_KEYWORDS,
  EMOJI_INTEREST_MAP,
  SENSITIVE_CATEGORIES,
} from "./taxonomy";
import { getEmojiInterests } from "./extractors";

// ── Interests ───────────────────────────────────────────────

export function inferInterests(
  raw: FollowerRawPayload,
  signals: ExtractedSignals
): InferenceTag[] {
  const scores = new Map<string, { total: number; evidence: string[]; fields: Set<string> }>();

  const bio = (raw.bio || "").toLowerCase();
  const name = (raw.full_name || "").toLowerCase();
  const captionText = (raw.recent_captions || []).join(" ").toLowerCase();
  const allText = `${bio} ${name} ${captionText}`;

  for (const [interest, keywords] of Object.entries(INTEREST_KEYWORDS)) {
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();

      if (bio.includes(kwLower)) {
        addScore(scores, interest, 0.4, `bio contains '${kw}'`, "bio");
      }
      if (name.includes(kwLower)) {
        addScore(scores, interest, 0.3, `name contains '${kw}'`, "full_name");
      }
      if (captionText.includes(kwLower)) {
        addScore(scores, interest, 0.2, `captions mention '${kw}'`, "recent_captions");
      }
    }
  }

  for (const hashtag of signals.hashtags) {
    for (const [interest, keywords] of Object.entries(INTEREST_KEYWORDS)) {
      if (keywords.some((kw) => hashtag.includes(kw.replace(/\s+/g, "")))) {
        addScore(scores, interest, 0.15, `hashtag #${hashtag}`, "hashtags");
      }
    }
  }

  const emojiInterests = getEmojiInterests(signals.emojis);
  for (const [emoji, interests] of emojiInterests) {
    for (const interest of interests) {
      addScore(scores, interest, 0.1, `emoji ${emoji} suggests ${interest}`, "bio");
    }
  }

  for (const linkCat of signals.link_categories) {
    const catToInterest: Record<string, string[]> = {
      portfolio: ["graphic_design", "illustration"],
      developer: ["coding"],
      ecommerce: ["ecommerce"],
      creator: ["marketing"],
      music: ["music"],
      photography: ["photography"],
      design: ["graphic_design", "ui_ux"],
      typefoundry: ["typography"],
    };
    const interests = catToInterest[linkCat] || [];
    for (const interest of interests) {
      addScore(scores, interest, 0.25, `link domain categorized as ${linkCat}`, "external_url");
    }
  }

  if (raw.category) {
    const catMap: Record<string, string[]> = {
      "Photographer": ["photography"],
      "Artist": ["art", "illustration"],
      "Designer": ["graphic_design"],
      "Musician/Band": ["music"],
      "Restaurant": ["food"],
      "Fitness Model": ["fitness"],
      "Personal Blog": [],
      "Product/Service": ["ecommerce"],
    };
    const interests = catMap[raw.category];
    if (interests) {
      for (const interest of interests) {
        addScore(scores, interest, 0.35, `account category is '${raw.category}'`, "category");
      }
    }
  }

  return normalizeScores(scores, allText);
}

// ── Segments ────────────────────────────────────────────────

export function inferSegments(
  raw: FollowerRawPayload,
  signals: ExtractedSignals
): InferenceTag[] {
  const scores = new Map<string, { total: number; evidence: string[]; fields: Set<string> }>();
  const bio = (raw.bio || "").toLowerCase();
  const name = (raw.full_name || "").toLowerCase();
  const allText = `${bio} ${name}`;

  for (const [segment, keywords] of Object.entries(SEGMENT_KEYWORDS)) {
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (bio.includes(kwLower)) {
        addScore(scores, segment, 0.45, `bio contains '${kw}'`, "bio");
      }
      if (name.includes(kwLower)) {
        addScore(scores, segment, 0.3, `name contains '${kw}'`, "full_name");
      }
    }
  }

  for (const linkCat of signals.link_categories) {
    const catMap: Record<string, string> = {
      portfolio: "designer",
      developer: "developer",
      business: "founder",
      ecommerce: "local_business_owner",
      creator: "creator",
    };
    const seg = catMap[linkCat];
    if (seg) {
      addScore(scores, seg, 0.2, `link categorized as '${linkCat}'`, "external_url");
    }
  }

  if (raw.is_business) {
    addScore(scores, "local_business_owner", 0.15, "account is marked as business", "is_business");
  }

  if (raw.account_type === "BUSINESS") {
    addScore(scores, "local_business_owner", 0.15, "account_type is BUSINESS", "account_type");
  }

  const stats = raw.followers_count;
  if (stats && stats > 10000) {
    addScore(scores, "creator", 0.1, `high follower count (${stats})`, "followers_count");
  }

  return normalizeScores(scores, allText);
}

// ── Intent ──────────────────────────────────────────────────

export function inferIntent(
  raw: FollowerRawPayload,
  signals: ExtractedSignals
): InferenceTag[] {
  const scores = new Map<string, { total: number; evidence: string[]; fields: Set<string> }>();
  const bio = (raw.bio || "").toLowerCase();
  const allText = `${bio} ${(raw.recent_captions || []).join(" ").toLowerCase()}`;

  for (const [intent, keywords] of Object.entries(INTENT_SIGNALS)) {
    for (const kw of keywords) {
      if (allText.includes(kw.toLowerCase())) {
        addScore(scores, intent, 0.3, `text contains '${kw}'`, "bio");
      }
    }
  }

  if (raw.is_business || raw.account_type === "BUSINESS") {
    addScore(scores, "business", 0.35, "account is business type", "account_type");
  }

  if (signals.contact_clues.length > 0) {
    addScore(scores, "business", 0.15, `contact clues: ${signals.contact_clues.join(", ")}`, "bio");
  }

  if (signals.link_categories.includes("creator")) {
    addScore(scores, "creator", 0.25, "link points to creator platform", "external_url");
  }

  if (signals.link_categories.includes("portfolio")) {
    addScore(scores, "professional", 0.25, "link points to portfolio", "external_url");
  }

  if (raw.media_count && raw.media_count > 200) {
    addScore(scores, "creator", 0.1, `high media count (${raw.media_count})`, "media_count");
  }

  const hasNoBusinessSignals =
    !raw.is_business &&
    raw.account_type !== "BUSINESS" &&
    signals.contact_clues.length === 0 &&
    signals.link_categories.length === 0;

  if (hasNoBusinessSignals) {
    addScore(scores, "personal", 0.2, "no business/professional signals detected", "account_type");
  }

  if (scores.size === 0) {
    return [{ tag: "personal", confidence: 0.3, evidence: ["default — insufficient data"], source_fields: [] }];
  }

  return normalizeScores(scores, allText);
}

// ── Commercial ──────────────────────────────────────────────

export function inferCommercial(
  raw: FollowerRawPayload,
  signals: ExtractedSignals
): InferenceTag[] {
  const scores = new Map<string, { total: number; evidence: string[]; fields: Set<string> }>();
  const bio = (raw.bio || "").toLowerCase();
  const allText = `${bio} ${(raw.recent_captions || []).join(" ").toLowerCase()}`;

  for (const [commercial, keywords] of Object.entries(COMMERCIAL_SIGNALS)) {
    for (const kw of keywords) {
      if (allText.includes(kw.toLowerCase())) {
        addScore(scores, commercial, 0.3, `text contains '${kw}'`, "bio");
      }
    }
  }

  if (raw.is_business && signals.contact_clues.length > 0) {
    addScore(scores, "likely_b2c", 0.2, "business account with contact info", "is_business");
  }

  if (raw.followers_count && raw.followers_count > 5000) {
    addScore(scores, "likely_collaboration_candidate", 0.15,
      `follower count ${raw.followers_count} suggests influence`, "followers_count");
  }

  if (signals.link_categories.includes("ecommerce")) {
    addScore(scores, "likely_b2c", 0.25, "link to ecommerce platform", "external_url");
  }

  return normalizeScores(scores, allText);
}

// ── Geo ─────────────────────────────────────────────────────

export function inferGeo(
  raw: FollowerRawPayload,
  signals: ExtractedSignals
): InferenceTag[] {
  const tags: InferenceTag[] = [];

  if (raw.city_name) {
    tags.push({
      tag: raw.city_name,
      confidence: 0.9,
      evidence: [`city_name field: '${raw.city_name}'`],
      source_fields: ["city_name"],
    });
  }

  for (const hint of signals.location_hints) {
    if (!tags.some((t) => t.tag === hint)) {
      tags.push({
        tag: hint,
        confidence: 0.5,
        evidence: [`location keyword detected in text`],
        source_fields: ["bio", "recent_captions"],
      });
    }
  }

  return tags;
}

// ── Scoring ─────────────────────────────────────────────────

export function computeConfidenceScores(profile: {
  inferred_interests: InferenceTag[];
  inferred_segments: InferenceTag[];
  inferred_intent: InferenceTag[];
  inferred_commercial: InferenceTag[];
  inferred_geo: InferenceTag[];
}): ConfidenceScores {
  const interestsConf = avgConfidence(profile.inferred_interests);
  const segmentsConf = avgConfidence(profile.inferred_segments);
  const intentConf = avgConfidence(profile.inferred_intent);
  const commercialConf = avgConfidence(profile.inferred_commercial);
  const geoConf = avgConfidence(profile.inferred_geo);

  const weights = { interests: 0.3, segments: 0.25, intent: 0.2, commercial: 0.15, geo: 0.1 };
  const overall = clamp(
    interestsConf * weights.interests +
    segmentsConf * weights.segments +
    intentConf * weights.intent +
    commercialConf * weights.commercial +
    geoConf * weights.geo,
    0,
    1
  );

  return {
    overall: round(overall),
    interests: round(interestsConf),
    segments: round(segmentsConf),
    intent: round(intentConf),
    commercial: round(commercialConf),
    geo: round(geoConf),
  };
}

export function computeSourceCompleteness(raw: FollowerRawPayload): number {
  const fields: [string, unknown][] = [
    ["username", raw.username],
    ["full_name", raw.full_name],
    ["bio", raw.bio],
    ["external_url", raw.external_url],
    ["category", raw.category],
    ["profile_picture_url", raw.profile_picture_url],
    ["followers_count", raw.followers_count],
    ["follows_count", raw.follows_count],
    ["media_count", raw.media_count],
    ["recent_captions", raw.recent_captions?.length],
    ["account_type", raw.account_type],
  ];

  const present = fields.filter(([, v]) => v != null && v !== "" && v !== 0).length;
  return round(present / fields.length);
}

// ── Helpers ─────────────────────────────────────────────────

function addScore(
  map: Map<string, { total: number; evidence: string[]; fields: Set<string> }>,
  tag: string,
  score: number,
  evidence: string,
  field: string
): void {
  if (SENSITIVE_CATEGORIES.has(tag)) return;

  const entry = map.get(tag) || { total: 0, evidence: [], fields: new Set<string>() };
  entry.total += score;
  entry.evidence.push(evidence);
  entry.fields.add(field);
  map.set(tag, entry);
}

function normalizeScores(
  map: Map<string, { total: number; evidence: string[]; fields: Set<string> }>,
  _context: string
): InferenceTag[] {
  const tags: InferenceTag[] = [];

  for (const [tag, data] of map) {
    const confidence = clamp(data.total, 0, 1);
    if (confidence < 0.1) continue;

    tags.push({
      tag,
      confidence: round(confidence),
      evidence: data.evidence.slice(0, 10),
      source_fields: [...data.fields],
    });
  }

  return tags.sort((a, b) => b.confidence - a.confidence);
}

function avgConfidence(tags: InferenceTag[]): number {
  if (tags.length === 0) return 0;
  const topTags = tags.slice(0, 5);
  return topTags.reduce((s, t) => s + t.confidence, 0) / topTags.length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
