import { promises as fs } from "fs";
import path from "path";
import type {
  FollowerProfile,
  ProfileRun,
  ImportRecord,
  ProfileFilterParams,
  AudienceAnalytics,
  TagCount,
  ClusterSummary,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

interface StoreData<T> {
  version: number;
  updated_at: string;
  items: Record<string, T>;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore<T>(filename: string): Promise<StoreData<T>> {
  const filepath = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(filepath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { version: 1, updated_at: new Date().toISOString(), items: {} };
  }
}

async function writeStore<T>(filename: string, data: StoreData<T>): Promise<void> {
  await ensureDir();
  data.updated_at = new Date().toISOString();
  const filepath = path.join(DATA_DIR, filename);
  const tmp = filepath + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, filepath);
}

const PROFILES_FILE = "follower_profiles.json";
const RUNS_FILE = "profile_runs.json";
const IMPORTS_FILE = "imports.json";

// ── Profiles ────────────────────────────────────────────────

export async function getProfile(id: string): Promise<FollowerProfile | null> {
  const store = await readStore<FollowerProfile>(PROFILES_FILE);
  return store.items[id] ?? null;
}

export async function getProfileByUsername(username: string): Promise<FollowerProfile | null> {
  const store = await readStore<FollowerProfile>(PROFILES_FILE);
  return Object.values(store.items).find(
    (p) => p.username.toLowerCase() === username.toLowerCase()
  ) ?? null;
}

export async function upsertProfile(profile: FollowerProfile): Promise<FollowerProfile> {
  const store = await readStore<FollowerProfile>(PROFILES_FILE);
  const existing = store.items[profile.id];
  if (existing) {
    profile.profile_version = (existing.profile_version || 0) + 1;
    profile.created_at = existing.created_at;
  }
  profile.updated_at = new Date().toISOString();
  store.items[profile.id] = profile;
  await writeStore(PROFILES_FILE, store);
  return profile;
}

export async function upsertProfiles(profiles: FollowerProfile[]): Promise<number> {
  const store = await readStore<FollowerProfile>(PROFILES_FILE);
  let count = 0;
  for (const profile of profiles) {
    const existing = store.items[profile.id];
    if (existing) {
      profile.profile_version = (existing.profile_version || 0) + 1;
      profile.created_at = existing.created_at;
    }
    profile.updated_at = new Date().toISOString();
    store.items[profile.id] = profile;
    count++;
  }
  await writeStore(PROFILES_FILE, store);
  return count;
}

export async function getAllProfiles(): Promise<FollowerProfile[]> {
  const store = await readStore<FollowerProfile>(PROFILES_FILE);
  return Object.values(store.items);
}

export async function queryProfiles(params: ProfileFilterParams): Promise<{
  profiles: FollowerProfile[];
  total: number;
}> {
  const all = await getAllProfiles();
  let filtered = all;

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.display_name.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q)
    );
  }

  if (params.interest) {
    filtered = filtered.filter((p) =>
      p.inferred_interests.some((t) => t.tag === params.interest)
    );
  }

  if (params.segment) {
    filtered = filtered.filter((p) =>
      p.inferred_segments.some((t) => t.tag === params.segment)
    );
  }

  if (params.intent) {
    filtered = filtered.filter((p) =>
      p.inferred_intent.some((t) => t.tag === params.intent)
    );
  }

  if (params.commercial) {
    filtered = filtered.filter((p) =>
      p.inferred_commercial.some((t) => t.tag === params.commercial)
    );
  }

  if (params.min_confidence != null) {
    filtered = filtered.filter(
      (p) => p.confidence_scores.overall >= params.min_confidence!
    );
  }

  const total = filtered.length;

  const sortBy = params.sort_by || "confidence";
  const sortOrder = params.sort_order || "desc";
  const mult = sortOrder === "desc" ? -1 : 1;

  filtered.sort((a, b) => {
    switch (sortBy) {
      case "confidence":
        return mult * (a.confidence_scores.overall - b.confidence_scores.overall);
      case "completeness":
        return mult * (a.source_completeness_score - b.source_completeness_score);
      case "recency":
        return mult * (new Date(a.last_profiled_at).getTime() - new Date(b.last_profiled_at).getTime());
      case "username":
        return mult * a.username.localeCompare(b.username);
      default:
        return 0;
    }
  });

  const offset = params.offset || 0;
  const limit = params.limit || 50;
  const paged = filtered.slice(offset, offset + limit);

  return { profiles: paged, total };
}

export async function deleteProfile(id: string): Promise<boolean> {
  const store = await readStore<FollowerProfile>(PROFILES_FILE);
  if (!store.items[id]) return false;
  delete store.items[id];
  await writeStore(PROFILES_FILE, store);
  return true;
}

// ── Runs ────────────────────────────────────────────────────

export async function createRun(run: ProfileRun): Promise<ProfileRun> {
  const store = await readStore<ProfileRun>(RUNS_FILE);
  store.items[run.id] = run;
  await writeStore(RUNS_FILE, store);
  return run;
}

export async function updateRun(run: ProfileRun): Promise<ProfileRun> {
  const store = await readStore<ProfileRun>(RUNS_FILE);
  store.items[run.id] = run;
  await writeStore(RUNS_FILE, store);
  return run;
}

export async function getRun(id: string): Promise<ProfileRun | null> {
  const store = await readStore<ProfileRun>(RUNS_FILE);
  return store.items[id] ?? null;
}

export async function getRecentRuns(limit = 20): Promise<ProfileRun[]> {
  const store = await readStore<ProfileRun>(RUNS_FILE);
  return Object.values(store.items)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, limit);
}

// ── Imports ─────────────────────────────────────────────────

export async function createImport(rec: ImportRecord): Promise<ImportRecord> {
  const store = await readStore<ImportRecord>(IMPORTS_FILE);
  store.items[rec.id] = rec;
  await writeStore(IMPORTS_FILE, store);
  return rec;
}

export async function getRecentImports(limit = 20): Promise<ImportRecord[]> {
  const store = await readStore<ImportRecord>(IMPORTS_FILE);
  return Object.values(store.items)
    .sort((a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime())
    .slice(0, limit);
}

// ── Analytics ───────────────────────────────────────────────

export async function computeAnalytics(): Promise<AudienceAnalytics> {
  const profiles = await getAllProfiles();
  const total = profiles.length;
  const profiled = profiles.filter((p) => p.last_profiled_at);

  if (total === 0) {
    return emptyAnalytics();
  }

  const avgCompleteness = avg(profiles.map((p) => p.source_completeness_score));
  const avgConfidence = avg(profiled.map((p) => p.confidence_scores.overall));

  const topInterests = aggregateTags(profiles, (p) => p.inferred_interests);
  const topSegments = aggregateTags(profiles, (p) => p.inferred_segments);
  const intentDist = aggregateTags(profiles, (p) => p.inferred_intent);
  const commercialDist = aggregateTags(profiles, (p) => p.inferred_commercial);

  const langMap = new Map<string, number>();
  for (const p of profiles) {
    if (p.detected_language) {
      langMap.set(p.detected_language, (langMap.get(p.detected_language) || 0) + 1);
    }
  }
  const langDist: TagCount[] = [...langMap.entries()]
    .map(([tag, count]) => ({ tag, count, percentage: (count / total) * 100, avg_confidence: 1 }))
    .sort((a, b) => b.count - a.count);

  const geoDist = aggregateTags(profiles, (p) => p.inferred_geo);

  const clusters = buildClusters(profiles, topSegments.slice(0, 5));

  return {
    total_profiles: total,
    profiled_count: profiled.length,
    avg_completeness: round(avgCompleteness),
    avg_confidence: round(avgConfidence),
    top_interests: topInterests.slice(0, 20),
    top_segments: topSegments.slice(0, 15),
    intent_distribution: intentDist,
    commercial_distribution: commercialDist,
    language_distribution: langDist,
    geo_distribution: geoDist.slice(0, 15),
    high_confidence_clusters: clusters,
  };
}

function aggregateTags(
  profiles: FollowerProfile[],
  getter: (p: FollowerProfile) => { tag: string; confidence: number }[]
): TagCount[] {
  const total = profiles.length;
  const map = new Map<string, { count: number; totalConf: number }>();

  for (const p of profiles) {
    for (const t of getter(p)) {
      const entry = map.get(t.tag) || { count: 0, totalConf: 0 };
      entry.count++;
      entry.totalConf += t.confidence;
      map.set(t.tag, entry);
    }
  }

  return [...map.entries()]
    .map(([tag, v]) => ({
      tag,
      count: v.count,
      percentage: round((v.count / total) * 100),
      avg_confidence: round(v.totalConf / v.count),
    }))
    .sort((a, b) => b.count - a.count);
}

function buildClusters(profiles: FollowerProfile[], topSegments: TagCount[]): ClusterSummary[] {
  return topSegments.slice(0, 5).map((seg) => {
    const inSegment = profiles.filter((p) =>
      p.inferred_segments.some((s) => s.tag === seg.tag)
    );
    const interestCounts = new Map<string, number>();
    for (const p of inSegment) {
      for (const i of p.inferred_interests) {
        interestCounts.set(i.tag, (interestCounts.get(i.tag) || 0) + 1);
      }
    }
    const topInterests = [...interestCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    return {
      label: seg.tag,
      count: inSegment.length,
      percentage: round((inSegment.length / profiles.length) * 100),
      top_interests: topInterests,
      avg_confidence: round(
        avg(inSegment.map((p) => p.confidence_scores.overall))
      ),
    };
  });
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyAnalytics(): AudienceAnalytics {
  return {
    total_profiles: 0,
    profiled_count: 0,
    avg_completeness: 0,
    avg_confidence: 0,
    top_interests: [],
    top_segments: [],
    intent_distribution: [],
    commercial_distribution: [],
    language_distribution: [],
    geo_distribution: [],
    high_confidence_clusters: [],
  };
}
