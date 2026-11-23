import { NextResponse } from "next/server";
import { z } from "zod";
import { sha256Hex } from "@/lib/crypto";
import { getStore } from "@/lib/db";
import { sanitizeEventForClient } from "@/lib/party-utils";
import { broadcastRoomUpdate, getRoomRehearsal } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const LockGenderSchema = z.object({
  gender: z.enum(["boy", "girl"]),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ secretToken: string }> }
) {
  const { secretToken } = await context.params;
  if (!secretToken || secretToken.length < 10) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const store = getStore();
  const event = await store.findEventBySecretTokenHash(sha256Hex(secretToken));
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    title: event.title,
    locale: event.locale,
    locked: Boolean(event.secret_locked_at || event.true_gender),
    phase: event.phase,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ secretToken: string }> }
) {
  const { secretToken } = await context.params;
  if (!secretToken || secretToken.length < 10) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = LockGenderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid gender selection" }, { status: 400 });
  }

  const store = getStore();
  const event = await store.findEventBySecretTokenHash(sha256Hex(secretToken));
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (event.secret_locked_at || event.true_gender) {
    return NextResponse.json({ error: "already_locked" }, { status: 409 });
  }

  const updated = await store.updateEvent(event.id, {
    true_gender: parsed.data.gender,
    secret_locked_at: new Date().toISOString(),
  });

  const participants = await store.listParticipants(updated.id);
  const sanitized = sanitizeEventForClient(updated, participants, {
    includeParticipants: true,
    rehearsal: getRoomRehearsal(updated.room_code),
  });
  // Broadcasts genderConfigured: true (WITHOUT leaking true_gender!)
  await broadcastRoomUpdate(updated.room_code, sanitized);

  return NextResponse.json({ ok: true, locked: true });
}
