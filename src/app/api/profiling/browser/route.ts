import { fetchFollowersWithBrowser, type BrowserEvent } from "@/lib/profiling/browser";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
