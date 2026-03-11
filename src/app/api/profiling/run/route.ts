import { NextRequest, NextResponse } from "next/server";
import { getAllProfiles, getRecentRuns } from "@/lib/profiling/store";
import { profileBatch, profileOne, businessDiscoveryToRaw } from "@/lib/profiling/profiler";
import type { FollowerRawPayload } from "@/lib/profiling/types";

const GRAPH_API = "https://graph.instagram.com/v21.0";

/**
 * POST /api/profiling/run
 * Body options:
 *   { action: "reprofile_all" } — re-profile all stored profiles
 *   { action: "profile_one", username: "..." } — profile a single user via business_discovery
 *   { action: "profile_usernames", usernames: ["..."] } — profile multiple usernames via business_discovery
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");

    switch (action) {
      case "reprofile_all": {
        const profiles = await getAllProfiles();
        if (profiles.length === 0) {
          return NextResponse.json({ error: "No profiles to re-profile" }, { status: 400 });
        }

        const rawPayloads = profiles.map((p) => p.raw_payload);
        const { run } = await profileBatch(rawPayloads);
        return NextResponse.json({
          run_id: run.id,
          status: run.status,
          total: run.total_profiles,
          succeeded: run.succeeded,
          failed: run.failed,
        });
      }

      case "profile_one": {
        const username = body.username;
        if (!username) {
          return NextResponse.json({ error: "username required" }, { status: 400 });
        }

        let raw: FollowerRawPayload;

        if (accessToken) {
          try {
            raw = await fetchBusinessDiscovery(username, accessToken);
          } catch (err) {
            raw = body.raw_data || { username };
            if (!body.raw_data) {
              console.warn(`[profiling/run] business_discovery failed for ${username}, using minimal data:`, err);
            }
          }
        } else {
          raw = body.raw_data || { username };
        }

        const result = await profileOne(raw);
        return NextResponse.json({
          profile: result.profile,
          is_new: result.isNew,
          processing_time_ms: result.processingTimeMs,
        });
      }

      case "profile_usernames": {
        const usernames: string[] = body.usernames || [];
        if (usernames.length === 0) {
          return NextResponse.json({ error: "usernames array required" }, { status: 400 });
        }

        const rawPayloads: FollowerRawPayload[] = [];
        for (const username of usernames.slice(0, 100)) {
          if (accessToken) {
            try {
              const raw = await fetchBusinessDiscovery(username, accessToken);
              rawPayloads.push(raw);
              // Rate limit: 200 calls/hour for business_discovery
              await new Promise((r) => setTimeout(r, 500));
            } catch {
              rawPayloads.push({ username });
            }
          } else {
            rawPayloads.push({ username });
          }
        }

        const { run } = await profileBatch(rawPayloads);
        return NextResponse.json({
          run_id: run.id,
          status: run.status,
          total: run.total_profiles,
          succeeded: run.succeeded,
          failed: run.failed,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[profiling/run] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Run failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const runs = await getRecentRuns(20);
    return NextResponse.json({ data: runs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load runs" },
      { status: 500 }
    );
  }
}

async function fetchBusinessDiscovery(
  username: string,
  accessToken: string
): Promise<FollowerRawPayload> {
  const fields = [
    "id", "username", "name", "biography", "profile_picture_url",
    "followers_count", "follows_count", "media_count", "website",
    "media{id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count}",
  ].join(",");

  const url = `${GRAPH_API}/me?fields=business_discovery.username(${username}){${fields}}&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || "business_discovery failed");
  }

  return businessDiscoveryToRaw(data.business_discovery || {});
}
