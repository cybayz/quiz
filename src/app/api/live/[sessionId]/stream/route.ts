import { NextRequest } from "next/server";
import { liveEvents } from "@/lib/live-events";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let pingInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connect notification
      controller.enqueue(encoder.encode(`event: CONNECTED\ndata: {"sessionId":"${sessionId}"}\n\n`));

      // Subscribe to real-time events
      unsubscribe = liveEvents.subscribe(sessionId, ({ event, payload }) => {
        try {
          const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch (e) {
          console.error("Stream enqueue error:", e);
        }
      });

      // Send periodic ping to keep serverless HTTP connection active
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (pingInterval) clearInterval(pingInterval);
        }
      }, 10000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (pingInterval) clearInterval(pingInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
