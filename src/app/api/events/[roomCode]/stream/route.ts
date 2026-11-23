import { getStore, resolveCountdownIfExpired } from "@/lib/db";
import { sanitizeEventForClient } from "@/lib/party-utils";
import { getRoomRehearsal, subscribeToRoom } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await context.params;
  const store = getStore();
  const found = await store.findEventByRoomCode(roomCode);
  if (!found) {
    return new Response("Room not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream closed
        }
      };

      const { event } = await resolveCountdownIfExpired(found);
      const participants = await store.listParticipants(event.id);
      const initial = sanitizeEventForClient(event, participants, {
        includeParticipants: event.phase === "revealed" && event.allow_guest_collage,
        rehearsal: getRoomRehearsal(event.room_code),
      });
      sendEvent(initial);

      cleanup = subscribeToRoom(event.room_code, (payload) => {
        // Strip participant list for non-host guest stream unless revealed + allowed
        const safePayload =
          payload.phase === "revealed" && payload.allowGuestCollage
            ? payload
            : { ...payload, participants: [] };
        sendEvent(safePayload);
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 20000);

      request.signal.addEventListener("abort", () => {
        if (cleanup) cleanup();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      if (cleanup) cleanup();
      if (heartbeat) clearInterval(heartbeat);
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
