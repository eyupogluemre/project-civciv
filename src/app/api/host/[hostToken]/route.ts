import { NextResponse } from "next/server";
import { z } from "zod";
import { sha256Hex } from "@/lib/crypto";
import { getStore, resolveCountdownIfExpired } from "@/lib/db";
import { IDLE_REHEARSAL, sanitizeEventForClient } from "@/lib/party-utils";
import {
  broadcastRoomUpdate,
  getRoomRehearsal,
  setRoomRehearsal,
} from "@/lib/realtime";

export const dynamic = "force-dynamic";

const HostPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_phase"),
    phase: z.enum(["lobby", "color_show"]),
  }),
  z.object({
    action: z.literal("start_countdown"),
    countdownSeconds: z.number().int().min(3).max(30).optional(),
  }),
  z.object({
    action: z.literal("finalize_reveal"),
  }),
  z.object({
    action: z.literal("rehearsal"),
    rehearsalPhase: z.enum(["idle", "color_show", "countdown"]),
    simulatedGender: z.enum(["boy", "girl"]).optional(),
  }),
  z.object({
    action: z.literal("remove_participant"),
    participantId: z.string().min(1),
  }),
  z.object({
    action: z.literal("update_settings"),
    allowGuestCollage: z.boolean().optional(),
    countdownSeconds: z.number().int().min(3).max(30).optional(),
    title: z.string().trim().min(2).max(80).optional(),
  }),
  z.object({
    action: z.literal("delete_photos"),
  }),
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ hostToken: string }> }
) {
  const { hostToken } = await context.params;
  if (!hostToken || hostToken.length < 10) {
    return NextResponse.json({ error: "Invalid host token" }, { status: 404 });
  }

  const store = getStore();
  const found = await store.findEventByHostTokenHash(sha256Hex(hostToken));
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { event, transitioned } = await resolveCountdownIfExpired(found);
  const participants = await store.listParticipants(event.id);
  const sanitized = sanitizeEventForClient(event, participants, {
    includeParticipants: true,
    rehearsal: getRoomRehearsal(event.room_code),
  });

  if (transitioned) {
    await broadcastRoomUpdate(event.room_code, sanitized);
  }

  return NextResponse.json(sanitized, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ hostToken: string }> }
) {
  const { hostToken } = await context.params;
  if (!hostToken || hostToken.length < 10) {
    return NextResponse.json({ error: "Invalid host token" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = HostPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid host action", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const store = getStore();
  const found = await store.findEventByHostTokenHash(sha256Hex(hostToken));
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let { event } = await resolveCountdownIfExpired(found);
  const action = parsed.data;

  switch (action.action) {
    case "set_phase": {
      if (event.phase === "revealed") {
        return NextResponse.json(
          { error: "Event is already revealed" },
          { status: 409 }
        );
      }
      setRoomRehearsal(event.room_code, IDLE_REHEARSAL);
      event = await store.updateEvent(event.id, {
        phase: action.phase,
        countdown_ends_at: null,
      });
      break;
    }

    case "start_countdown": {
      if (event.phase === "revealed") {
        return NextResponse.json(
          { error: "Event is already revealed" },
          { status: 409 }
        );
      }
      if (!event.true_gender) {
        return NextResponse.json(
          { error: "gender_not_configured" },
          { status: 409 }
        );
      }
      const seconds = action.countdownSeconds ?? event.countdown_seconds;
      const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
      setRoomRehearsal(event.room_code, IDLE_REHEARSAL);
      event = await store.updateEvent(event.id, {
        phase: "countdown",
        countdown_seconds: seconds,
        countdown_ends_at: endsAt,
      });
      break;
    }

    case "finalize_reveal": {
      if (
        event.phase === "countdown" &&
        event.countdown_ends_at &&
        Date.now() >= new Date(event.countdown_ends_at).getTime() - 250
      ) {
        event = await store.updateEvent(event.id, {
          phase: "revealed",
          revealed_at: event.revealed_at ?? new Date().toISOString(),
        });
      }
      break;
    }

    case "rehearsal": {
      if (event.phase === "revealed" || event.phase === "countdown") {
        return NextResponse.json(
          { error: "Rehearsal unavailable during or after live reveal" },
          { status: 409 }
        );
      }
      if (action.rehearsalPhase === "idle") {
        setRoomRehearsal(event.room_code, IDLE_REHEARSAL);
      } else if (action.rehearsalPhase === "color_show") {
        setRoomRehearsal(event.room_code, {
          phase: "color_show",
          countdownEndsAt: null,
          simulatedGender: null,
        });
      } else if (action.rehearsalPhase === "countdown") {
        // Strictly independent simulated gender — NEVER reads event.true_gender!
        const simGender =
          action.simulatedGender ?? (Math.random() < 0.5 ? "boy" : "girl");
        setRoomRehearsal(event.room_code, {
          phase: "countdown",
          countdownEndsAt: new Date(Date.now() + 5000).toISOString(),
          simulatedGender: simGender,
        });
      }
      break;
    }

    case "remove_participant": {
      await store.removeParticipant(event.id, action.participantId);
      break;
    }

    case "update_settings": {
      event = await store.updateEvent(event.id, {
        ...(action.allowGuestCollage !== undefined
          ? { allow_guest_collage: action.allowGuestCollage }
          : {}),
        ...(action.countdownSeconds !== undefined
          ? { countdown_seconds: action.countdownSeconds }
          : {}),
        ...(action.title !== undefined ? { title: action.title } : {}),
      });
      break;
    }

    case "delete_photos": {
      await store.deleteAllEventSelfies(event.id);
      event = await store.updateEvent(event.id, {
        photos_deleted_at: new Date().toISOString(),
      });
      break;
    }
  }

  const participants = await store.listParticipants(event.id);
  const sanitized = sanitizeEventForClient(event, participants, {
    includeParticipants: true,
    rehearsal: getRoomRehearsal(event.room_code),
  });
  await broadcastRoomUpdate(event.room_code, sanitized);

  return NextResponse.json(sanitized);
}
