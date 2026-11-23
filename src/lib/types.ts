export type Locale = "tr" | "en";

export type TierId = "mini" | "party" | "mega";

export type Gender = "boy" | "girl";

export type GenderMode = "host" | "secret_keeper";

export type PartyPhase =
  | "setup"
  | "lobby"
  | "color_show"
  | "countdown"
  | "revealed";

export type RehearsalPhase =
  | "idle"
  | "color_show"
  | "countdown"
  | "revealed";

export interface RehearsalState {
  phase: RehearsalPhase;
  countdownEndsAt: string | null;
  /** Strictly simulated — never read from event.true_gender */
  simulatedGender: Gender | null;
}

export interface OrderRecord {
  id: string;
  provider: "lemonsqueezy" | "mock" | "manual";
  provider_order_id: string | null;
  customer_email: string;
  tier: TierId;
  max_guests: number;
  amount_cents: number;
  currency: string;
  status: "paid" | "refunded";
  locale: Locale;
  created_at: string;
}

export interface RedeemCodeRecord {
  id: string;
  code: string;
  order_id: string | null;
  tier: TierId;
  max_guests: number;
  customer_email: string | null;
  status: "unused" | "redeemed" | "revoked";
  redeemed_at: string | null;
  note: string | null;
  created_at: string;
}

export interface EventRecord {
  id: string;
  redeem_code_id: string | null;
  room_code: string;
  host_token_hash: string;
  secret_token_hash: string | null;
  secret_locked_at: string | null;
  host_email: string | null;
  title: string;
  locale: Locale;
  gender_mode: GenderMode;
  true_gender: Gender | null;
  phase: PartyPhase;
  countdown_seconds: number;
  countdown_ends_at: string | null;
  revealed_at: string | null;
  allow_guest_collage: boolean;
  max_guests: number;
  photos_expires_at: string;
  photos_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantRecord {
  id: string;
  event_id: string;
  guest_token_hash: string;
  name: string;
  prediction: Gender;
  selfie_path: string | null;
  is_removed: boolean;
  created_at: string;
}

export interface SanitizedParticipant {
  id: string;
  name: string;
  prediction: Gender;
  selfieUrl: string | null;
  createdAt: string;
}

export interface PartyStats {
  total: number;
  boyCount: number;
  girlCount: number;
  boyPercent: number;
  girlPercent: number;
}

/**
 * Strictly sanitized client state.
 * Zero-Leak Rule: `revealedGender` is ONLY populated when `phase === "revealed"`.
 */
export interface SanitizedEventState {
  id: string;
  roomCode: string;
  title: string;
  locale: Locale;
  genderMode: GenderMode;
  genderConfigured: boolean;
  phase: PartyPhase;
  countdownSeconds: number;
  countdownEndsAt: string | null;
  revealedAt: string | null;
  revealedGender: Gender | null;
  allowGuestCollage: boolean;
  maxGuests: number;
  photosExpiresAt: string;
  photosDeleted: boolean;
  stats: PartyStats;
  rehearsal: RehearsalState;
  /** Included for host always, and for guests once revealed (or for collage) */
  participants: SanitizedParticipant[];
  serverTimeMs: number;
}

export interface DevEmailRecord {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  code?: string;
  link?: string;
  sentAt: string;
}
