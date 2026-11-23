import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { generateRedeemCode, generateRoomCode } from "../crypto";
import type {
  DevEmailRecord,
  EventRecord,
  OrderRecord,
  ParticipantRecord,
  RedeemCodeRecord,
} from "../types";
import type {
  CreateEventInput,
  CreateOrderInput,
  CreateRedeemCodeInput,
  DataStore,
  UpdateEventPatch,
  UpsertParticipantInput,
} from "./interface";

interface MockDbState {
  orders: OrderRecord[];
  redeemCodes: RedeemCodeRecord[];
  events: EventRecord[];
  participants: ParticipantRecord[];
  devEmails: DevEmailRecord[];
}

const DATA_DIR = path.join(process.cwd(), ".local-data");
const DB_FILE = path.join(DATA_DIR, "mock-db.json");
const SELFIES_DIR = path.join(DATA_DIR, "selfies");

function createInitialState(): MockDbState {
  const now = new Date().toISOString();
  // Seed classic demo code AABB1997 (from original repo) so local testing works immediately
  const seededCode: RedeemCodeRecord = {
    id: crypto.randomUUID(),
    code: "AABB1997",
    order_id: null,
    tier: "party",
    max_guests: 75,
    customer_email: "demo@boyorgirl.party",
    status: "unused",
    redeemed_at: null,
    note: "Dev/Demo seed code (Party 75)",
    created_at: now,
  };
  return {
    orders: [],
    redeemCodes: [seededCode],
    events: [],
    participants: [],
    devEmails: [],
  };
}

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SELFIES_DIR)) {
    fs.mkdirSync(SELFIES_DIR, { recursive: true });
  }
}

function loadStateFromDisk(): MockDbState {
  try {
    ensureDirs();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<MockDbState>;
      return {
        orders: parsed.orders ?? [],
        redeemCodes: parsed.redeemCodes ?? [],
        events: parsed.events ?? [],
        participants: parsed.participants ?? [],
        devEmails: parsed.devEmails ?? [],
      };
    }
  } catch {
    // Fallback to fresh seed if local JSON is corrupt or unreadable
  }
  const initial = createInitialState();
  persistStateToDisk(initial);
  return initial;
}

function persistStateToDisk(state: MockDbState) {
  try {
    ensureDirs();
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Ignore read-only filesystem errors (e.g. serverless fallback)
  }
}

declare global {
  var __civcivMockDbState: MockDbState | undefined;
}

function getState(): MockDbState {
  if (!globalThis.__civcivMockDbState) {
    globalThis.__civcivMockDbState = loadStateFromDisk();
  }
  return globalThis.__civcivMockDbState;
}

function saveState(state: MockDbState) {
  globalThis.__civcivMockDbState = state;
  persistStateToDisk(state);
}

export class MockDataStore implements DataStore {
  async createOrder(
    input: CreateOrderInput
  ): Promise<{ order: OrderRecord; created: boolean }> {
    const state = getState();
    if (input.provider_order_id) {
      const existing = state.orders.find(
        (o) => o.provider_order_id === input.provider_order_id
      );
      if (existing) return { order: existing, created: false };
    }
    const order: OrderRecord = {
      id: crypto.randomUUID(),
      provider: input.provider,
      provider_order_id: input.provider_order_id ?? null,
      customer_email: input.customer_email,
      tier: input.tier,
      max_guests: input.max_guests,
      amount_cents: input.amount_cents,
      currency: input.currency,
      status: "paid",
      locale: input.locale,
      created_at: new Date().toISOString(),
    };
    state.orders.unshift(order);
    saveState(state);
    return { order, created: true };
  }

  async findOrderByProviderId(providerOrderId: string): Promise<OrderRecord | null> {
    const state = getState();
    return (
      state.orders.find((o) => o.provider_order_id === providerOrderId) ?? null
    );
  }

  async listOrders(limit = 100): Promise<OrderRecord[]> {
    return getState().orders.slice(0, limit);
  }

  async createRedeemCode(input: CreateRedeemCodeInput): Promise<RedeemCodeRecord> {
    const state = getState();
    let code = input.customCode?.trim().toUpperCase() || generateRedeemCode();
    while (state.redeemCodes.some((c) => c.code === code)) {
      code = generateRedeemCode();
    }
    const record: RedeemCodeRecord = {
      id: crypto.randomUUID(),
      code,
      order_id: input.order_id ?? null,
      tier: input.tier,
      max_guests: input.max_guests,
      customer_email: input.customer_email ?? null,
      status: "unused",
      redeemed_at: null,
      note: input.note ?? null,
      created_at: new Date().toISOString(),
    };
    state.redeemCodes.unshift(record);
    saveState(state);
    return record;
  }

  async findRedeemCodeByCode(code: string): Promise<RedeemCodeRecord | null> {
    const normalized = code.trim().toUpperCase();
    return getState().redeemCodes.find((c) => c.code === normalized) ?? null;
  }

  async findRedeemCodeByOrderId(orderId: string): Promise<RedeemCodeRecord | null> {
    return getState().redeemCodes.find((c) => c.order_id === orderId) ?? null;
  }

  async markRedeemCodeUsed(codeId: string): Promise<void> {
    const state = getState();
    const rec = state.redeemCodes.find((c) => c.id === codeId);
    if (rec) {
      rec.status = "redeemed";
      rec.redeemed_at = new Date().toISOString();
      saveState(state);
    }
  }

  async listRedeemCodes(limit = 100): Promise<RedeemCodeRecord[]> {
    return getState().redeemCodes.slice(0, limit);
  }

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const state = getState();
    let roomCode = generateRoomCode();
    while (state.events.some((e) => e.room_code === roomCode)) {
      roomCode = generateRoomCode();
    }
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const event: EventRecord = {
      id: crypto.randomUUID(),
      redeem_code_id: input.redeem_code_id,
      room_code: roomCode,
      host_token_hash: input.host_token_hash,
      secret_token_hash: input.secret_token_hash,
      secret_locked_at: input.true_gender ? now.toISOString() : null,
      host_email: input.host_email,
      title: input.title,
      locale: input.locale,
      gender_mode: input.gender_mode,
      true_gender: input.true_gender,
      phase: "lobby",
      countdown_seconds: input.countdown_seconds,
      countdown_ends_at: null,
      revealed_at: null,
      allow_guest_collage: input.allow_guest_collage,
      max_guests: input.max_guests,
      photos_expires_at: expires.toISOString(),
      photos_deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    state.events.unshift(event);
    saveState(state);
    return event;
  }

  async findEventById(id: string): Promise<EventRecord | null> {
    return getState().events.find((e) => e.id === id) ?? null;
  }

  async findEventByRoomCode(roomCode: string): Promise<EventRecord | null> {
    const normalized = roomCode.trim().toUpperCase();
    return getState().events.find((e) => e.room_code === normalized) ?? null;
  }

  async findEventByHostTokenHash(hash: string): Promise<EventRecord | null> {
    return getState().events.find((e) => e.host_token_hash === hash) ?? null;
  }

  async findEventBySecretTokenHash(hash: string): Promise<EventRecord | null> {
    return getState().events.find((e) => e.secret_token_hash === hash) ?? null;
  }

  async updateEvent(id: string, patch: UpdateEventPatch): Promise<EventRecord> {
    const state = getState();
    const idx = state.events.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Event not found");
    const updated: EventRecord = {
      ...state.events[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    state.events[idx] = updated;
    saveState(state);
    return updated;
  }

  async listEvents(limit = 100): Promise<EventRecord[]> {
    return getState().events.slice(0, limit);
  }

  async deleteEvent(id: string): Promise<void> {
    await this.deleteAllEventSelfies(id);
    const state = getState();
    state.events = state.events.filter((e) => e.id !== id);
    state.participants = state.participants.filter((p) => p.event_id !== id);
    saveState(state);
  }

  async findExpiredPhotoEvents(nowIso: string): Promise<EventRecord[]> {
    const nowMs = new Date(nowIso).getTime();
    return getState().events.filter(
      (e) =>
        !e.photos_deleted_at && new Date(e.photos_expires_at).getTime() <= nowMs
    );
  }

  async upsertParticipant(
    input: UpsertParticipantInput
  ): Promise<ParticipantRecord> {
    const state = getState();
    const existingIdx = state.participants.findIndex(
      (p) =>
        p.event_id === input.event_id &&
        p.guest_token_hash === input.guest_token_hash
    );
    if (existingIdx !== -1) {
      const prev = state.participants[existingIdx];
      const updated: ParticipantRecord = {
        ...prev,
        name: input.name,
        prediction: input.prediction,
        selfie_path:
          input.selfie_path !== undefined ? input.selfie_path : prev.selfie_path,
        is_removed: false,
      };
      state.participants[existingIdx] = updated;
      saveState(state);
      return updated;
    }

    const participant: ParticipantRecord = {
      id: crypto.randomUUID(),
      event_id: input.event_id,
      guest_token_hash: input.guest_token_hash,
      name: input.name,
      prediction: input.prediction,
      selfie_path: input.selfie_path ?? null,
      is_removed: false,
      created_at: new Date().toISOString(),
    };
    state.participants.push(participant);
    saveState(state);
    return participant;
  }

  async listParticipants(eventId: string): Promise<ParticipantRecord[]> {
    return getState().participants.filter(
      (p) => p.event_id === eventId && !p.is_removed
    );
  }

  async findParticipantByGuestHash(
    eventId: string,
    guestTokenHash: string
  ): Promise<ParticipantRecord | null> {
    return (
      getState().participants.find(
        (p) =>
          p.event_id === eventId &&
          p.guest_token_hash === guestTokenHash &&
          !p.is_removed
      ) ?? null
    );
  }

  async removeParticipant(eventId: string, participantId: string): Promise<boolean> {
    const state = getState();
    const rec = state.participants.find(
      (p) => p.event_id === eventId && p.id === participantId
    );
    if (!rec) return false;
    rec.is_removed = true;
    saveState(state);
    return true;
  }

  async saveSelfie(
    eventId: string,
    fileName: string,
    buffer: Buffer
  ): Promise<string> {
    ensureDirs();
    const eventDir = path.join(SELFIES_DIR, path.basename(eventId));
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }
    const safeFile = path.basename(fileName);
    fs.writeFileSync(path.join(eventDir, safeFile), buffer);
    return `${path.basename(eventId)}/${safeFile}`;
  }

  async getSelfieBuffer(
    eventId: string,
    fileName: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const fullPath = path.join(
      SELFIES_DIR,
      path.basename(eventId),
      path.basename(fileName)
    );
    if (!fs.existsSync(fullPath)) return null;
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
    return { buffer, contentType };
  }

  async deleteAllEventSelfies(eventId: string): Promise<number> {
    const eventDir = path.join(SELFIES_DIR, path.basename(eventId));
    let removed = 0;
    if (fs.existsSync(eventDir)) {
      const files = fs.readdirSync(eventDir);
      removed = files.length;
      fs.rmSync(eventDir, { recursive: true, force: true });
    }
    const state = getState();
    for (const p of state.participants) {
      if (p.event_id === eventId) {
        p.selfie_path = null;
      }
    }
    saveState(state);
    return removed;
  }

  async saveDevEmail(
    email: Omit<DevEmailRecord, "id" | "sentAt">
  ): Promise<DevEmailRecord> {
    const state = getState();
    const record: DevEmailRecord = {
      ...email,
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
    };
    state.devEmails.unshift(record);
    if (state.devEmails.length > 50) {
      state.devEmails = state.devEmails.slice(0, 50);
    }
    saveState(state);
    return record;
  }

  async listDevEmails(limit = 30): Promise<DevEmailRecord[]> {
    return getState().devEmails.slice(0, limit);
  }
}
