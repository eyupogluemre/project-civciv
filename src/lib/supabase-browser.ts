"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { SanitizedEventState } from "./types";

/**
 * Subscribes to Supabase Realtime Broadcast for a room when public Supabase env vars are configured.
 * Returns an unsubscribe cleanup function, or null if Supabase is not configured on the client.
 */
export function subscribeSupabaseRoom(
  roomCode: string,
  onUpdate: (state: SanitizedEventState) => void
): (() => void) | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const channel: RealtimeChannel = client
    .channel(`party:${roomCode.trim().toUpperCase()}`, {
      config: { broadcast: { self: false } },
    })
    .on("broadcast", { event: "state_update" }, (message) => {
      if (message?.payload) {
        onUpdate(message.payload as SanitizedEventState);
      }
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
