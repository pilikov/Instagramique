import type {
  InstagramProfile,
  InstagramMedia,
  InstagramComment,
  InstagramInsight,
} from "./types";

const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";
const FACEBOOK_GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

interface ApiError {
  error: {
    message: string;
    type?: string;
    code?: number;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T | ApiError;

  if (!response.ok) {
    const err = data as ApiError;
    if (err?.error?.message) {
      throw new Error(err.error.message);
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if ("error" in (data as object)) {
    const err = data as ApiError;
    throw new Error(err.error.message);
  }

  return data as T;
}

/**
 * Exchange short-lived token for long-lived token
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const url = new URL(`${FACEBOOK_GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url.toString());
  return handleResponse(response);
}

/**
 * Get user profile: GET /me?fields=id,username,name,account_type,profile_picture_url,biography,website,followers_count,follows_count,media_count
 */
export async function getUserProfile(
  accessToken: string
): Promise<InstagramProfile> {
  const url = new URL(`${GRAPH_API_BASE}/me`);
  url.searchParams.set(
    "fields",
    "id,username,name,account_type,profile_picture_url,biography,website,followers_count,follows_count,media_count"
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  return handleResponse(response);
}

/**
 * Get user media: GET /me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{media_url,media_type}&limit=50
 */
export async function getUserMedia(
  accessToken: string,
  limit = 50,
  after?: string
): Promise<{
  data: InstagramMedia[];
  paging?: { cursors: { after: string }; next?: string };
}> {
  const url = new URL(`${GRAPH_API_BASE}/me/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{media_url,media_type}"
  );
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", String(limit));
  if (after) {
    url.searchParams.set("after", after);
  }

  const response = await fetch(url.toString());
  return handleResponse(response);
}

/**
 * Get media comments: GET /{media-id}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}
 */
export async function getMediaComments(
  mediaId: string,
  accessToken: string
): Promise<{ data: InstagramComment[] }> {
  const url = new URL(`${GRAPH_API_BASE}/${mediaId}/comments`);
  url.searchParams.set(
    "fields",
    "id,text,username,timestamp,like_count,replies{id,text,username,timestamp}"
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  return handleResponse(response);
}

/**
 * Get user stories: GET /me/stories?fields=id,media_type,media_url,timestamp,caption
 */
export async function getUserStories(
  accessToken: string
): Promise<{ data: InstagramMedia[] }> {
  const url = new URL(`${GRAPH_API_BASE}/me/stories`);
  url.searchParams.set(
    "fields",
    "id,media_type,media_url,timestamp,caption"
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  return handleResponse(response);
}

/**
 * Get media insights: GET /{media-id}/insights?metric=impressions,reach,saved,views,likes,comments,shares,plays,total_interactions
 */
export async function getMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<{ data: InstagramInsight[] }> {
  const url = new URL(`${GRAPH_API_BASE}/${mediaId}/insights`);
  url.searchParams.set(
    "metric",
    "impressions,reach,saved,views,likes,comments,shares,plays,total_interactions"
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  return handleResponse(response);
}

/**
 * Get user insights (account level): GET /me/insights?metric=impressions,reach,profile_views,accounts_engaged,total_interactions&period=day&since={since}&until={until}
 */
export async function getUserInsights(
  accessToken: string,
  since?: string,
  until?: string
): Promise<{ data: InstagramInsight[] }> {
  const url = new URL(`${GRAPH_API_BASE}/me/insights`);
  url.searchParams.set(
    "metric",
    "impressions,reach,profile_views,accounts_engaged,total_interactions"
  );
  url.searchParams.set("period", "day");
  url.searchParams.set("access_token", accessToken);
  if (since) {
    url.searchParams.set("since", since);
  }
  if (until) {
    url.searchParams.set("until", until);
  }

  const response = await fetch(url.toString());
  return handleResponse(response);
}

/**
 * Get business discovery (for searching other accounts if needed)
 */
export async function getBusinessDiscovery(
  username: string,
  accessToken: string
): Promise<unknown> {
  const url = new URL(`${GRAPH_API_BASE}/me`);
  url.searchParams.set(
    "fields",
    `business_discovery.username(${username}){id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count,media{id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count}}`
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  return handleResponse(response);
}
