import { NextRequest, NextResponse } from "next/server";
import { scrapeProfile, scrapeBatch, type ScrapeOptions } from "@/lib/profiling/scraper";
import { profileOne, profileBatch } from "@/lib/profiling/profiler";
import { getAllProfiles } from "@/lib/profiling/store";

/**
 * POST /api/profiling/scrape
 *
 * Body:
 *   { action: "scrape_one", username: "...", session_id?: "...", csrf_token?: "..." }
 *   { action: "scrape_batch", usernames: ["..."], session_id?: "...", csrf_token?: "..." }
 *   { action: "enrich_all", session_id?: "...", csrf_token?: "..." }
 *     — re-scrape all existing profiles that have low completeness
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    const opts: ScrapeOptions = {
      sessionId: body.session_id || undefined,
      csrfToken: body.csrf_token || undefined,
      delayMs: body.delay_ms ?? 1500,
    };

    switch (action) {
      case "scrape_one": {
        const username = body.username;
        if (!username) {
          return NextResponse.json({ error: "username required" }, { status: 400 });
        }

        const scrapeResult = await scrapeProfile(username, opts);
        const profileResult = await profileOne(scrapeResult.raw);

        return NextResponse.json({
          profile: profileResult.profile,
          scrape_source: scrapeResult.source,
          scrape_error: scrapeResult.error || null,
          is_new: profileResult.isNew,
        });
      }

      case "scrape_batch": {
        const usernames: string[] = body.usernames || [];
        if (usernames.length === 0) {
          return NextResponse.json({ error: "usernames array required" }, { status: 400 });
        }

        const capped = usernames.slice(0, 200);
        const scrapeResults = await scrapeBatch(capped, opts);

        const rawPayloads = scrapeResults.map((r) => r.raw);
        const { run } = await profileBatch(rawPayloads);

        const sources = scrapeResults.reduce(
          (acc, r) => {
            acc[r.source] = (acc[r.source] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        return NextResponse.json({
          run_id: run.id,
          total: capped.length,
          succeeded: run.succeeded,
          failed: run.failed,
          sources,
          errors: scrapeResults
            .filter((r) => r.error)
            .map((r) => ({ username: r.raw.username, error: r.error })),
        });
      }

      case "enrich_all": {
        const profiles = await getAllProfiles();
        const toEnrich = profiles.filter((p) => p.source_completeness_score < 0.3);

        if (toEnrich.length === 0) {
          return NextResponse.json({
            message: "No profiles need enrichment (all have completeness >= 30%)",
            total: 0,
          });
        }

        const usernames = toEnrich.map((p) => p.username);
        const capped = usernames.slice(0, 200);
        const scrapeResults = await scrapeBatch(capped, opts);

        const rawPayloads = scrapeResults.map((r) => r.raw);
        const { run } = await profileBatch(rawPayloads);

        return NextResponse.json({
          run_id: run.id,
          total: capped.length,
          total_needing_enrichment: toEnrich.length,
          succeeded: run.succeeded,
          failed: run.failed,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[profiling/scrape] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 500 }
    );
  }
}
