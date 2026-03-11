import { NextResponse } from "next/server";
import { fetchFollowersWithBrowser, type BrowserEvent } from "@/lib/profiling/browser";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/profiling/browser
 *
 * Check whether the browser-based flow is available in this environment.
 */
export async function GET() {
  const isVercel = !!process.env.VERCEL;
  const hasChromePath = !!process.env.CHROME_PATH;

  if (isVercel) {
    return NextResponse.json({ available: false, reason: "serverless" });
  }

  if (hasChromePath) {
    return NextResponse.json({ available: true, chrome: process.env.CHROME_PATH });
  }

  const platform = process.platform;
  const defaultPath =
    platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : null;

  return NextResponse.json({
    available: !!defaultPath,
    chrome: defaultPath,
    reason: defaultPath ? undefined : "no_chrome_path",
  });
}

/**
 * POST /api/profiling/browser
 *
 * Launches a visible Chromium instance, fetches the followers list
 * via Instagram's internal API, profiles them, and streams progress
 * back as Server-Sent Events.
 */
export async function POST() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: BrowserEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          /* stream closed by client */
        }
      };

      try {
        await fetchFollowersWithBrowser(send);
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unexpected error" });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
