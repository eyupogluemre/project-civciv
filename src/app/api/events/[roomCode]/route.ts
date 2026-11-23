import { NextResponse } from "next/server";
import { sha256Hex } from "@/lib/crypto";
import { getStore, resolveCountdownIfExpired } from "@/lib/db";
import { buildMediaUrl, sanitizeEventForClient } from "@/lib/party-utils";
import { broadcastRoomUpdate, getRoomRehearsal } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await context.params;
  if (!roomCode || roomCode.trim().length < 4) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const store = getStore();
  const found = await store.findEventByRoomCode(roomCode);
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { event, transitioned } = await resolveCountdownIfExpired(found);
  const participants = await store.listParticipants(event.id);

  // Guests receive the participant grid once revealed (when guest collage is enabled)
  const includeParticipants =
    event.phase === "revealed" && event.allow_guest_collage;

  const sanitized = sanitizeEventForClient(event, participants, {
    includeParticipants,
    rehearsal: getRoomRehearsal(event.room_code),
  });

  if (transitioned) {
    await broadcastRoomUpdate(
      event.room_code,
      sanitizeEventForClient(event, participants, {
        includeParticipants: true,
        rehearsal: getRoomRehearsal(event.room_code),
      })
    );
  }

  const guestToken = request.headers.get("x-guest-token");
  let me = null;
  if (guestToken && guestToken.length >= 8) {
    const mine = await store.findParticipantByGuestHash(
      event.id,
      sha256Hex(guestToken)
    );
    if (mine) {
      me = {
        id: mine.id,
        name: mine.name,
        prediction: mine.prediction,
        selfieUrl: event.photos_deleted_at
          ? null
          : buildMediaUrl(event.id, mine.selfie_path),
      };
    }
  }

  return NextResponse.json(
    { event: sanitized, me },
    { headers: { "Cache-Control": "no-store" } }
  );
}
