import { isSupabaseConfigured } from "../env";
import type { EventRecord } from "../types";
import type { DataStore } from "./interface";
import { MockDataStore } from "./mock-store";
import { SupabaseDataStore } from "./supabase-store";

declare global {
  var __civcivStore: DataStore | undefined;
}

export function getStore(): DataStore {
  if (!globalThis.__civcivStore) {
    globalThis.__civcivStore = isSupabaseConfigured()
      ? new SupabaseDataStore()
      : new MockDataStore();
  }
  return globalThis.__civcivStore;
}

/**
 * Automatically flips `countdown` -> `revealed` once `countdown_ends_at` has passed.
 * Ensures serverless reliability even if host disconnects mid-countdown.
 */
export async function resolveCountdownIfExpired(
  event: EventRecord
): Promise<{ event: EventRecord; transitioned: boolean }> {
  if (
    event.phase === "countdown" &&
    event.countdown_ends_at &&
    Date.now() >= new Date(event.countdown_ends_at).getTime()
  ) {
    const store = getStore();
    const updated = await store.updateEvent(event.id, {
      phase: "revealed",
      revealed_at: event.revealed_at ?? new Date().toISOString(),
    });
    return { event: updated, transitioned: true };
  }
  return { event, transitioned: false };
}
