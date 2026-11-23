import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { generateSecretToken, sha256Hex } from "@/lib/crypto";
import { getStore, resolveCountdownIfExpired } from "@/lib/db";
import { buildMediaUrl, sanitizeEventForClient } from "@/lib/party-utils";
import { broadcastRoomUpdate, getRoomRehearsal } from "@/lib/realtime";
import type { Gender } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/webp", "image/png"]);
const MAX_SELFIE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(
  request: Request,
  context: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await context.params;
  const store = getStore();
  const found = await store.findEventByRoomCode(roomCode);
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { event } = await resolveCountdownIfExpired(found);

  let name = "";
  let prediction: Gender | null = null;
  let guestToken = request.headers.get("x-guest-token") || "";
  let selfieFile: File | null = null;
  let clearSelfie = false;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    name = String(form.get("name") || "").trim();
    const rawPred = String(form.get("prediction") || "");
    if (rawPred === "boy" || rawPred === "girl") prediction = rawPred;
    const tokenField = form.get("guestToken");
    if (typeof tokenField === "string" && tokenField.trim().length >= 8) {
      guestToken = tokenField.trim();
    }
    clearSelfie = form.get("clearSelfie") === "true";
    const file = form.get("selfie");
    if (file instanceof File && file.size > 0) {
      selfieFile = file;
    }
  } else {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      prediction?: string;
      guestToken?: string;
      clearSelfie?: boolean;
    } | null;
    if (body) {
      name = String(body.name || "").trim();
      if (body.prediction === "boy" || body.prediction === "girl") {
        prediction = body.prediction;
      }
      if (body.guestToken && body.guestToken.trim().length >= 8) {
        guestToken = body.guestToken.trim();
      }
      clearSelfie = Boolean(body.clearSelfie);
    }
  }

  if (name.length < 1 || name.length > 40) {
    return NextResponse.json({ error: "Invalid guest name" }, { status: 400 });
  }
  if (!prediction) {
    return NextResponse.json({ error: "Invalid prediction" }, { status: 400 });
  }

  if (!guestToken || guestToken.length < 8) {
    guestToken = generateSecretToken(18);
  }
  const guestTokenHash = sha256Hex(guestToken);

  const existingParticipants = await store.listParticipants(event.id);
  const existingGuest = existingParticipants.find(
    (p) => p.guest_token_hash === guestTokenHash
  );

  // Enforce tier guest limit without penalizing existing reconnecting guests
  if (!existingGuest && existingParticipants.length >= event.max_guests) {
    return NextResponse.json({ error: "room_full" }, { status: 403 });
  }

  let selfiePath: string | null | undefined = undefined;
  if (clearSelfie) {
    selfiePath = null;
  } else if (selfieFile && !event.photos_deleted_at) {
    if (!ALLOWED_IMAGE_TYPES.has(selfieFile.type)) {
      return NextResponse.json(
        { error: "Unsupported image format" },
        { status: 400 }
      );
    }
    if (selfieFile.size > MAX_SELFIE_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max 2MB)" },
        { status: 400 }
      );
    }
    const arrayBuffer = await selfieFile.arrayBuffer();
    const ext =
      selfieFile.type === "image/png"
        ? "png"
        : selfieFile.type === "image/webp"
          ? "webp"
          : "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    selfiePath = await store.saveSelfie(
      event.id,
      fileName,
      Buffer.from(arrayBuffer),
      selfieFile.type
    );
  }

  const saved = await store.upsertParticipant({
    event_id: event.id,
    guest_token_hash: guestTokenHash,
    name,
    prediction,
    selfie_path: selfiePath,
  });

  const updatedParticipants = await store.listParticipants(event.id);
  const broadcastState = sanitizeEventForClient(event, updatedParticipants, {
    includeParticipants: true,
    rehearsal: getRoomRehearsal(event.room_code),
  });
  await broadcastRoomUpdate(event.room_code, broadcastState);

  const guestState = sanitizeEventForClient(event, updatedParticipants, {
    includeParticipants: event.phase === "revealed" && event.allow_guest_collage,
    rehearsal: getRoomRehearsal(event.room_code),
  });

  return NextResponse.json({
    guestToken,
    me: {
      id: saved.id,
      name: saved.name,
      prediction: saved.prediction,
      selfieUrl: event.photos_deleted_at
        ? null
        : buildMediaUrl(event.id, saved.selfie_path),
    },
    event: guestState,
  });
}
