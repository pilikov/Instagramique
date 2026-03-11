export type Platform = "instagram";

export interface FollowerRawPayload {
  username: string;
  full_name?: string;
  bio?: string;
  external_url?: string;
  category?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  recent_captions?: string[];
  recent_media_urls?: string[];
  recent_hashtags?: string[];
  is_verified?: boolean;
  is_business?: boolean;
  contact_email?: string;
  contact_phone?: string;
  city_name?: string;
  [key: string]: unknown;
}

export interface InferenceTag {
  tag: string;
  confidence: number;
  evidence: string[];
  source_fields: string[];
}

export interface ProfileStats {
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  follower_following_ratio?: number;
}

export interface FollowerProfile {
  id: string;
  platform: Platform;
  account_id: string;
  username: string;
  display_name: string;
  bio: string;
  external_url: string;
  category: string;
  account_type: string;
  profile_picture_url: string;
  profile_stats: ProfileStats;
  recent_content_text: string[];
  recent_content_meta: ContentMeta[];
  detected_language: string;
  extracted_keywords: string[];
  extracted_hashtags: string[];
  extracted_emojis: string[];
  inferred_interests: InferenceTag[];
  inferred_segments: InferenceTag[];
  inferred_profession: InferenceTag[];
  inferred_intent: InferenceTag[];
  inferred_commercial: InferenceTag[];
  inferred_geo: InferenceTag[];
  confidence_scores: ConfidenceScores;
  source_completeness_score: number;
  last_profiled_at: string;
  created_at: string;
  updated_at: string;
  profile_version: number;
  raw_payload: FollowerRawPayload;
}

export interface ContentMeta {
  type?: string;
  url?: string;
  timestamp?: string;
  likes?: number;
  comments?: number;
}

export interface ConfidenceScores {
  overall: number;
  interests: number;
  segments: number;
  intent: number;
  commercial: number;
  geo: number;
}

export interface ProfileRun {
  id: string;
  started_at: string;
  finished_at?: string;
  status: "running" | "completed" | "failed";
  total_profiles: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: ProfileRunError[];
}

export interface ProfileRunError {
  username: string;
  error: string;
  timestamp: string;
}

export interface ImportRecord {
  id: string;
  filename: string;
  format: "csv" | "json" | "manual";
  imported_at: string;
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}

export interface ProfileFilterParams {
  segment?: string;
  interest?: string;
  intent?: string;
  commercial?: string;
  min_confidence?: number;
  search?: string;
  sort_by?: "confidence" | "completeness" | "recency" | "username";
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface AudienceAnalytics {
  total_profiles: number;
  profiled_count: number;
  avg_completeness: number;
  avg_confidence: number;
  top_interests: TagCount[];
  top_segments: TagCount[];
  intent_distribution: TagCount[];
  commercial_distribution: TagCount[];
  language_distribution: TagCount[];
  geo_distribution: TagCount[];
  high_confidence_clusters: ClusterSummary[];
}

export interface TagCount {
  tag: string;
  count: number;
  percentage: number;
  avg_confidence: number;
}

export interface ClusterSummary {
  label: string;
  count: number;
  percentage: number;
  top_interests: string[];
  avg_confidence: number;
}

export interface LLMProvider {
  enrich(profile: FollowerProfile): Promise<Partial<LLMEnrichmentResult>>;
}

export interface LLMEnrichmentResult {
  interests: InferenceTag[];
  segments: InferenceTag[];
  profession: InferenceTag[];
  summary: string;
}

export interface ExtractedSignals {
  keywords: string[];
  hashtags: string[];
  emojis: string[];
  link_domains: string[];
  link_categories: string[];
  detected_language: string;
  bio_tokens: string[];
  caption_tokens: string[];
  location_hints: string[];
  contact_clues: string[];
  category_signals: string[];
}
