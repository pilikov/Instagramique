import type { FollowerRawPayload } from "./types";

const IG_APP_ID = "936619743392459";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface ScrapeOptions {
  sessionId?: string;
  csrfToken?: string;
  delayMs?: number;
}

export interface ScrapeResult {
  raw: FollowerRawPayload;
  source: "web_profile_info" | "html_parse" | "graphql" | "minimal";
  error?: string;
}

/**
 * Scrape a public Instagram profile.
 * Strategy (in order of richness):
 *   1. web_profile_info API (needs session cookie for most profiles)
 *   2. HTML page parse (og: meta tags — works for some public profiles)
 *   3. Minimal fallback (username only)
 */
export async function scrapeProfile(
  username: string,
  opts: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const clean = username.replace(/^@/, "").trim().toLowerCase();
  if (!clean) {
    return { raw: { username: clean }, source: "minimal", error: "empty username" };
  }

  if (opts.sessionId) {
    try {
      const result = await scrapeViaWebProfileInfo(clean, opts);
      if (result) return result;
    } catch (e) {
      console.warn(`[scraper] web_profile_info failed for ${clean}:`, e);
    }
  }

  try {
    const result = await scrapeViaGraphQL(clean, opts);
    if (result) return result;
  } catch (e) {
    console.warn(`[scraper] graphql failed for ${clean}:`, e);
  }

  try {
    const result = await scrapeViaHTML(clean);
    if (result) return result;
  } catch (e) {
    console.warn(`[scraper] html parse failed for ${clean}:`, e);
  }

  return { raw: { username: clean }, source: "minimal", error: "all scrape methods failed" };
}

/**
 * Batch scrape with rate limiting.
 */
export async function scrapeBatch(
  usernames: string[],
  opts: ScrapeOptions = {},
  onProgress?: (done: number, total: number) => void
): Promise<ScrapeResult[]> {
  const delay = opts.delayMs ?? 1500;
  const results: ScrapeResult[] = [];

  for (let i = 0; i < usernames.length; i++) {
    const result = await scrapeProfile(usernames[i], opts);
    results.push(result);

    if (onProgress) onProgress(i + 1, usernames.length);

    if (i < usernames.length - 1 && delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return results;
}

// ── Strategy 1: web_profile_info API ────────────────────────

async function scrapeViaWebProfileInfo(
  username: string,
  opts: ScrapeOptions
): Promise<ScrapeResult | null> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "X-IG-App-ID": IG_APP_ID,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "X-Requested-With": "XMLHttpRequest",
    Referer: `https://www.instagram.com/${username}/`,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };

  if (opts.sessionId) {
    const cookieParts = [`sessionid=${opts.sessionId}`];
    if (opts.csrfToken) cookieParts.push(`csrftoken=${opts.csrfToken}`);
    headers["Cookie"] = cookieParts.join("; ");
    if (opts.csrfToken) {
      headers["X-CSRFToken"] = opts.csrfToken;
    }
  }

  const res = await fetch(url, { headers, redirect: "manual" });

  if (res.status === 302 || res.status === 301) return null;
  if (res.status === 404) return { raw: { username }, source: "web_profile_info", error: "profile not found" };
  if (!res.ok) return null;

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const user = (data.data as Record<string, unknown>)?.user as Record<string, unknown> | undefined;
  if (!user) return null;

  const edgeMedia = user.edge_owner_to_timeline_media as {
    edges?: Array<{ node: { edge_media_to_caption?: { edges?: Array<{ node: { text: string } }> } } }>;
  } | undefined;

  const recentCaptions = edgeMedia?.edges
    ?.slice(0, 12)
    .map((e) => e.node.edge_media_to_caption?.edges?.[0]?.node?.text || "")
    .filter(Boolean) || [];

  const raw: FollowerRawPayload = {
    username: (user.username as string) || username,
    full_name: (user.full_name as string) || "",
    bio: (user.biography as string) || "",
    external_url: (user.external_url as string) || "",
    profile_picture_url: (user.profile_pic_url_hd as string) || (user.profile_pic_url as string) || "",
    followers_count: (user.edge_followed_by as { count?: number })?.count,
    follows_count: (user.edge_follow as { count?: number })?.count,
    media_count: (edgeMedia as { count?: number })?.count,
    is_verified: user.is_verified as boolean | undefined,
    is_business: user.is_business_account as boolean | undefined,
    category: (user.category_name as string) || "",
    recent_captions: recentCaptions,
    city_name: (user.city_name as string) || "",
  };

  return { raw, source: "web_profile_info" };
}

// ── Strategy 2: GraphQL user info ───────────────────────────

async function scrapeViaGraphQL(
  username: string,
  opts: ScrapeOptions
): Promise<ScrapeResult | null> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "X-IG-App-ID": IG_APP_ID,
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  };

  if (opts.sessionId) {
    headers["Cookie"] = `sessionid=${opts.sessionId}`;
  }

  const res = await fetch(`https://www.instagram.com/${username}/`, {
    headers,
    redirect: "follow",
  });

  if (!res.ok) return null;

  const html = await res.text();

  const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
  if (sharedDataMatch) {
    try {
      const sharedData = JSON.parse(sharedDataMatch[1]);
      const user = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
      if (user) {
        return {
          raw: extractFromGraphQLUser(user, username),
          source: "graphql",
        };
      }
    } catch { /* fall through */ }
  }

  const additionalDataMatch = html.match(/"user":\s*(\{[^}]{50,}?"username"\s*:\s*"[^"]+?"[^}]*\})/);
  if (additionalDataMatch) {
    try {
      const user = JSON.parse(additionalDataMatch[1]);
      if (user.username) {
        return {
          raw: extractFromGraphQLUser(user, username),
          source: "graphql",
        };
      }
    } catch { /* fall through */ }
  }

  return null;
}

function extractFromGraphQLUser(user: Record<string, unknown>, fallbackUsername: string): FollowerRawPayload {
  return {
    username: (user.username as string) || fallbackUsername,
    full_name: (user.full_name as string) || "",
    bio: (user.biography as string) || "",
    external_url: (user.external_url as string) || "",
    profile_picture_url: (user.profile_pic_url_hd as string) || (user.profile_pic_url as string) || "",
    followers_count: (user.edge_followed_by as { count?: number })?.count,
    follows_count: (user.edge_follow as { count?: number })?.count,
    media_count: (user.edge_owner_to_timeline_media as { count?: number })?.count,
    is_verified: user.is_verified as boolean | undefined,
    is_business: user.is_business_account as boolean | undefined,
    category: (user.category_name as string) || "",
  };
}

// ── Strategy 3: HTML meta tag parse ─────────────────────────

async function scrapeViaHTML(username: string): Promise<ScrapeResult | null> {
  const url = `https://www.instagram.com/${username}/`;
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) return null;

  const html = await res.text();

  if (html.includes("Login") && html.includes("Sign up") && !html.includes(`"${username}"`)) {
    return null;
  }

  const ogDescription = extractMeta(html, "og:description");
  const ogTitle = extractMeta(html, "og:title");
  const ogImage = extractMeta(html, "og:image");

  if (!ogDescription && !ogTitle) return null;

  const raw: FollowerRawPayload = {
    username,
    profile_picture_url: ogImage || "",
  };

  if (ogTitle) {
    const titleMatch = ogTitle.match(/^(.+?)\s*\(@[^)]+\)/);
    if (titleMatch) {
      raw.full_name = titleMatch[1].trim();
    }
  }

  if (ogDescription) {
    const statsMatch = ogDescription.match(
      /([\d,.]+[KkMm]?)\s+Followers?,\s*([\d,.]+[KkMm]?)\s+Following,\s*([\d,.]+[KkMm]?)\s+Posts?/i
    );
    if (statsMatch) {
      raw.followers_count = parseHumanNumber(statsMatch[1]);
      raw.follows_count = parseHumanNumber(statsMatch[2]);
      raw.media_count = parseHumanNumber(statsMatch[3]);
    }

    const descParts = ogDescription.split(" - ");
    if (descParts.length > 1) {
      const bio = descParts.slice(1).join(" - ").trim();
      if (bio.length > 5 && !bio.startsWith("See Instagram")) {
        raw.bio = bio.replace(/^"/, "").replace(/"$/, "");
      }
    }
  }

  return { raw, source: "html_parse" };
}

// ── Followers List Fetcher (internal API) ────────────────────

export interface FollowersListResult {
  followers: FollowerRawPayload[];
  total_fetched: number;
  has_more: boolean;
  next_max_id?: string;
}

export interface FetchFollowersOptions {
  sessionId: string;
  csrfToken?: string;
  maxPages?: number;
  pageSize?: number;
  delayMs?: number;
  onPage?: (page: number, fetched: number, batch: FollowerRawPayload[]) => void;
}

/**
 * Resolve the numeric user PK from a session cookie.
 * Calls /api/v1/users/web_profile_info/ on the authenticated user's own profile,
 * or extracts it from the sessionid itself (format: "{pk}%3A...").
 */
export async function resolveUserId(sessionId: string): Promise<string> {
  const pkFromCookie = sessionId.split("%3A")[0] || sessionId.split(":")[0];
  if (/^\d{5,}$/.test(pkFromCookie)) {
    return pkFromCookie;
  }

  const headers = buildSessionHeaders(sessionId);
  const res = await fetch(
    "https://www.instagram.com/api/v1/accounts/current_user/?edit=true",
    { headers }
  );
  if (!res.ok) throw new Error(`Failed to resolve user ID: HTTP ${res.status}`);

  const data = await res.json();
  const pk = data?.user?.pk || data?.user?.pk_id;
  if (!pk) throw new Error("Could not resolve user ID from session");
  return String(pk);
}

/**
 * Fetch the full list of followers for a given user via Instagram's internal API.
 * This is the same endpoint the Instagram web app uses when you open the followers modal.
 *
 * Requires a valid sessionid cookie from the user's browser.
 */
export async function fetchFollowersList(
  userId: string,
  opts: FetchFollowersOptions
): Promise<FollowersListResult> {
  const maxPages = opts.maxPages ?? 100;
  const pageSize = opts.pageSize ?? 50;
  const delay = opts.delayMs ?? 2000;
  const headers = buildSessionHeaders(opts.sessionId, opts.csrfToken);

  const allFollowers: FollowerRawPayload[] = [];
  let maxId: string | undefined;
  let hasMore = true;

  for (let page = 0; page < maxPages && hasMore; page++) {
    const url = new URL(`https://www.instagram.com/api/v1/friendships/${userId}/followers/`);
    url.searchParams.set("count", String(pageSize));
    url.searchParams.set("search_surface", "follow_list_page");
    if (maxId) url.searchParams.set("max_id", maxId);

    const res = await fetch(url.toString(), { headers });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Session expired or invalid. Please update your sessionid.");
    }
    if (res.status === 429) {
      throw new Error(`Rate limited by Instagram. Fetched ${allFollowers.length} followers so far. Try again later.`);
    }
    if (!res.ok) {
      throw new Error(`Instagram API error: HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.status !== "ok" && !data.users) {
      throw new Error(data.message || "Unexpected API response");
    }

    const users: unknown[] = data.users || [];
    const batch = users.map(internalUserToRaw);

    allFollowers.push(...batch);
    hasMore = data.has_more === true || data.big_list === true;
    maxId = data.next_max_id ? String(data.next_max_id) : undefined;

    if (!maxId) hasMore = false;

    if (opts.onPage) {
      opts.onPage(page + 1, allFollowers.length, batch);
    }

    if (hasMore && delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return {
    followers: allFollowers,
    total_fetched: allFollowers.length,
    has_more: hasMore,
    next_max_id: maxId,
  };
}

function internalUserToRaw(user: unknown): FollowerRawPayload {
  const u = user as Record<string, unknown>;
  return {
    username: (u.username as string) || "",
    full_name: (u.full_name as string) || "",
    profile_picture_url: (u.profile_pic_url as string) || "",
    is_verified: u.is_verified as boolean | undefined,
    is_business: (u.is_business as boolean) || (u.account_type as number) === 2 || undefined,
    account_type: u.is_private ? "PRIVATE" : "PUBLIC",
  };
}

function buildSessionHeaders(sessionId: string, csrfToken?: string): Record<string, string> {
  const cookieParts = [`sessionid=${sessionId}`];
  if (csrfToken) cookieParts.push(`csrftoken=${csrfToken}`);

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "X-IG-App-ID": IG_APP_ID,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://www.instagram.com/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    Cookie: cookieParts.join("; "),
  };

  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  return headers;
}

// ── Instagram Data Export Parser ────────────────────────────

export interface InstagramExportFollower {
  username: string;
  href: string;
  timestamp: number;
}

/**
 * Parse Instagram's official data export file (JSON format).
 * Handles multiple known formats:
 *   - New format: array of { string_list_data: [{ value, href, timestamp }] }
 *   - connections/followers format
 *   - relationships_followers format
 */
export function parseInstagramExport(jsonText: string): InstagramExportFollower[] {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return [];
  }

  if (Array.isArray(data)) {
    return parseFollowersArray(data);
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;

    if (obj.relationships_followers && Array.isArray(obj.relationships_followers)) {
      return parseFollowersArray(obj.relationships_followers as unknown[]);
    }

    if (obj.followers && Array.isArray(obj.followers)) {
      return parseFollowersArray(obj.followers as unknown[]);
    }

    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0) {
        const parsed = parseFollowersArray(val);
        if (parsed.length > 0) return parsed;
      }
    }
  }

  return [];
}

function parseFollowersArray(arr: unknown[]): InstagramExportFollower[] {
  const followers: InstagramExportFollower[] = [];

  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;

    if (obj.string_list_data && Array.isArray(obj.string_list_data)) {
      for (const entry of obj.string_list_data as Record<string, unknown>[]) {
        const value = (entry.value as string) || "";
        const href = (entry.href as string) || "";
        const timestamp = (entry.timestamp as number) || 0;

        const username = value || extractUsernameFromHref(href);
        if (username) {
          followers.push({ username, href, timestamp });
        }
      }
      continue;
    }

    if (typeof obj.value === "string" || typeof obj.username === "string") {
      const username = (obj.username as string) || (obj.value as string) || "";
      if (username) {
        followers.push({
          username,
          href: (obj.href as string) || "",
          timestamp: (obj.timestamp as number) || 0,
        });
      }
    }
  }

  return followers;
}

function extractUsernameFromHref(href: string): string {
  if (!href) return "";
  const match = href.match(/instagram\.com\/([^/?#]+)/);
  return match ? match[1] : "";
}

/**
 * Parse Instagram data export HTML format.
 * The HTML file contains links like <a href="https://www.instagram.com/username">username</a>
 */
export function parseInstagramExportHTML(html: string): InstagramExportFollower[] {
  const followers: InstagramExportFollower[] = [];
  const regex = /href="https?:\/\/(?:www\.)?instagram\.com\/([^"/?]+)"[^>]*>([^<]+)</g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const username = match[1];
    if (username && !["p", "explore", "accounts", "reels", "stories"].includes(username)) {
      followers.push({
        username,
        href: `https://www.instagram.com/${username}`,
        timestamp: 0,
      });
    }
  }

  return followers;
}

// ── Helpers ─────────────────────────────────────────────────

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHTMLEntities(match[1]);
  }
  return null;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

function parseHumanNumber(str: string): number | undefined {
  if (!str) return undefined;
  const cleaned = str.replace(/,/g, "").trim();

  const suffixMatch = cleaned.match(/^([\d.]+)\s*([KkMm]?)$/);
  if (!suffixMatch) return undefined;

  let num = parseFloat(suffixMatch[1]);
  const suffix = suffixMatch[2].toUpperCase();

  if (suffix === "K") num *= 1000;
  if (suffix === "M") num *= 1000000;

  return Math.round(num);
}
