import type {
  EventRecord,
  ParticipantRecord,
  PartyStats,
  RehearsalState,
  SanitizedEventState,
  SanitizedParticipant,
} from "./types";

export const IDLE_REHEARSAL: RehearsalState = {
  phase: "idle",
  countdownEndsAt: null,
  simulatedGender: null,
};

export function computeStats(participants: ParticipantRecord[]): PartyStats {
  const active = participants.filter((p) => !p.is_removed);
  const total = active.length;
  const boyCount = active.filter((p) => p.prediction === "boy").length;
  const girlCount = total - boyCount;
  const boyPercent = total > 0 ? Math.round((boyCount / total) * 100) : 50;
  const girlPercent = total > 0 ? 100 - boyPercent : 50;
  return { total, boyCount, girlCount, boyPercent, girlPercent };
}

export function buildMediaUrl(eventId: string, selfiePath: string | null): string | null {
  if (!selfiePath) return null;
  const safeFile = selfiePath.split("/").pop();
  if (!safeFile) return null;
  return `/api/media/${encodeURIComponent(eventId)}/${encodeURIComponent(safeFile)}`;
}

/**
 * Strictly sanitizes event state for client consumption.
 * ZERO-LEAK INVARIANT: `revealedGender` is ALWAYS null unless `event.phase === "revealed"`.
 */
export function sanitizeEventForClient(
  event: EventRecord,
  participants: ParticipantRecord[],
  options: {
    includeParticipants: boolean;
    rehearsal?: RehearsalState;
  }
): SanitizedEventState {
  const activeParticipants = participants.filter((p) => !p.is_removed);
  const stats = computeStats(activeParticipants);
  const photosDeleted = Boolean(event.photos_deleted_at);

  const sanitizedParticipants: SanitizedParticipant[] = options.includeParticipants
    ? activeParticipants.map((p) => ({
        id: p.id,
        name: p.name,
        prediction: p.prediction,
        selfieUrl: photosDeleted ? null : buildMediaUrl(event.id, p.selfie_path),
        createdAt: p.created_at,
      }))
    : [];

  return {
    id: event.id,
    roomCode: event.room_code,
    title: event.title,
    locale: event.locale,
    genderMode: event.gender_mode,
    genderConfigured: Boolean(event.true_gender),
    phase: event.phase,
    countdownSeconds: event.countdown_seconds,
    countdownEndsAt: event.countdown_ends_at,
    revealedAt: event.revealed_at,
    // ZERO-LEAK GUARD: NEVER expose true_gender prior to revealed phase!
    revealedGender: event.phase === "revealed" ? event.true_gender : null,
    allowGuestCollage: event.allow_guest_collage,
    maxGuests: event.max_guests,
    photosExpiresAt: event.photos_expires_at,
    photosDeleted,
    stats,
    rehearsal: options.rehearsal ?? IDLE_REHEARSAL,
    participants: sanitizedParticipants,
    serverTimeMs: Date.now(),
  };
}
