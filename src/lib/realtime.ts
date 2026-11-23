import { isSupabaseConfigured } from "./env";
import { IDLE_REHEARSAL } from "./party-utils";
import type { RehearsalState, SanitizedEventState } from "./types";

type RoomListener = (payload: SanitizedEventState) => void;

declare global {
  var __civcivRoomListeners: Map<string, Set<RoomListener>> | undefined;
  var __civcivRehearsalState: Map<string, RehearsalState> | undefined;
}

function getListenerMap(): Map<string, Set<RoomListener>> {
  if (!globalThis.__civcivRoomListeners) {
    globalThis.__civcivRoomListeners = new Map();
  }
  return globalThis.__civcivRoomListeners;
}

function getRehearsalMap(): Map<string, RehearsalState> {
  if (!globalThis.__civcivRehearsalState) {
    globalThis.__civcivRehearsalState = new Map();
  }
  return globalThis.__civcivRehearsalState;
}

export function getRoomRehearsal(roomCode: string): RehearsalState {
  const key = roomCode.trim().toUpperCase();
  const state = getRehearsalMap().get(key);
  if (!state) return IDLE_REHEARSAL;

  // Auto-resolve rehearsal countdown -> simulated reveal when timer expires
  if (
    state.phase === "countdown" &&
    state.countdownEndsAt &&
    Date.now() >= new Date(state.countdownEndsAt).getTime()
  ) {
    const revealed: RehearsalState = {
      phase: "revealed",
      countdownEndsAt: state.countdownEndsAt,
      simulatedGender: state.simulatedGender ?? "boy",
    };
    getRehearsalMap().set(key, revealed);
    return revealed;
  }
  return state;
}

export function setRoomRehearsal(roomCode: string, state: RehearsalState): void {
  const key = roomCode.trim().toUpperCase();
  if (state.phase === "idle") {
    getRehearsalMap().delete(key);
  } else {
    getRehearsalMap().set(key, state);
  }
}

export function subscribeToRoom(
  roomCode: string,
  listener: RoomListener
): () => void {
  const key = roomCode.trim().toUpperCase();
  const map = getListenerMap();
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) {
      map.delete(key);
    }
  };
}

/**
 * Broadcasts sanitized party state to:
 * 1) Local SSE subscribers (instant in dev/mock and single-instance runtime)
 * 2) Supabase Realtime HTTP Broadcast API (multi-instance Vercel production)
 */
export async function broadcastRoomUpdate(
  roomCode: string,
  payload: SanitizedEventState
): Promise<void> {
  const key = roomCode.trim().toUpperCase();

  // 1. Local SSE listeners
  const listeners = getListenerMap().get(key);
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener(payload);
      } catch {
        // Ignore broken SSE subscriber
      }
    }
  }

  // 2. Supabase Realtime Broadcast REST endpoint (works statelessly on Vercel serverless!)
  if (isSupabaseConfigured()) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    try {
      await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              topic: `party:${key}`,
              event: "state_update",
              payload,
            },
          ],
        }),
      });
    } catch {
      // Clients also poll/reconnect gracefully; never fail mutation on broadcast hiccup
    }
  }
}
