import type {
  DevEmailRecord,
  EventRecord,
  Gender,
  GenderMode,
  Locale,
  OrderRecord,
  ParticipantRecord,
  PartyPhase,
  RedeemCodeRecord,
  TierId,
} from "../types";

export interface CreateOrderInput {
  provider: "lemonsqueezy" | "mock" | "manual";
  provider_order_id?: string | null;
  customer_email: string;
  tier: TierId;
  max_guests: number;
  amount_cents: number;
  currency: string;
  locale: Locale;
}

export interface CreateRedeemCodeInput {
  order_id?: string | null;
  tier: TierId;
  max_guests: number;
  customer_email?: string | null;
  note?: string | null;
  customCode?: string;
}

export interface CreateEventInput {
  redeem_code_id: string;
  host_token_hash: string;
  secret_token_hash: string | null;
  host_email: string | null;
  title: string;
  locale: Locale;
  gender_mode: GenderMode;
  true_gender: Gender | null;
  countdown_seconds: number;
  allow_guest_collage: boolean;
  max_guests: number;
}

export interface UpdateEventPatch {
  title?: string;
  locale?: Locale;
  true_gender?: Gender | null;
  secret_locked_at?: string | null;
  phase?: PartyPhase;
  countdown_seconds?: number;
  countdown_ends_at?: string | null;
  revealed_at?: string | null;
  allow_guest_collage?: boolean;
  photos_deleted_at?: string | null;
}

export interface UpsertParticipantInput {
  event_id: string;
  guest_token_hash: string;
  name: string;
  prediction: Gender;
  selfie_path?: string | null;
}

export interface DataStore {
  createOrder(input: CreateOrderInput): Promise<{ order: OrderRecord; created: boolean }>;
  findOrderByProviderId(providerOrderId: string): Promise<OrderRecord | null>;
  listOrders(limit?: number): Promise<OrderRecord[]>;

  createRedeemCode(input: CreateRedeemCodeInput): Promise<RedeemCodeRecord>;
  findRedeemCodeByCode(code: string): Promise<RedeemCodeRecord | null>;
  findRedeemCodeByOrderId(orderId: string): Promise<RedeemCodeRecord | null>;
  markRedeemCodeUsed(codeId: string): Promise<void>;
  listRedeemCodes(limit?: number): Promise<RedeemCodeRecord[]>;

  createEvent(input: CreateEventInput): Promise<EventRecord>;
  findEventById(id: string): Promise<EventRecord | null>;
  findEventByRoomCode(roomCode: string): Promise<EventRecord | null>;
  findEventByHostTokenHash(hash: string): Promise<EventRecord | null>;
  findEventBySecretTokenHash(hash: string): Promise<EventRecord | null>;
  updateEvent(id: string, patch: UpdateEventPatch): Promise<EventRecord>;
  listEvents(limit?: number): Promise<EventRecord[]>;
  deleteEvent(id: string): Promise<void>;
  findExpiredPhotoEvents(nowIso: string): Promise<EventRecord[]>;

  upsertParticipant(input: UpsertParticipantInput): Promise<ParticipantRecord>;
  listParticipants(eventId: string): Promise<ParticipantRecord[]>;
  findParticipantByGuestHash(
    eventId: string,
    guestTokenHash: string
  ): Promise<ParticipantRecord | null>;
  removeParticipant(eventId: string, participantId: string): Promise<boolean>;

  saveSelfie(
    eventId: string,
    fileName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string>;
  getSelfieBuffer(
    eventId: string,
    fileName: string
  ): Promise<{ buffer: Buffer; contentType: string } | null>;
  deleteAllEventSelfies(eventId: string): Promise<number>;

  saveDevEmail(email: Omit<DevEmailRecord, "id" | "sentAt">): Promise<DevEmailRecord>;
  listDevEmails(limit?: number): Promise<DevEmailRecord[]>;
}
