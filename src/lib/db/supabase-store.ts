import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

const SELFIE_BUCKET = "selfies";

declare global {
  var __civcivDevEmailFallback: DevEmailRecord[] | undefined;
}

export class SupabaseDataStore implements DataStore {
  private client: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async createOrder(
    input: CreateOrderInput
  ): Promise<{ order: OrderRecord; created: boolean }> {
    if (input.provider_order_id) {
      const existing = await this.findOrderByProviderId(input.provider_order_id);
      if (existing) return { order: existing, created: false };
    }
    const { data, error } = await this.client
      .from("orders")
      .insert({
        provider: input.provider,
        provider_order_id: input.provider_order_id ?? null,
        customer_email: input.customer_email,
        tier: input.tier,
        max_guests: input.max_guests,
        amount_cents: input.amount_cents,
        currency: input.currency,
        status: "paid",
        locale: input.locale,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505" && input.provider_order_id) {
        const existing = await this.findOrderByProviderId(input.provider_order_id);
        if (existing) return { order: existing, created: false };
      }
      throw new Error(`Supabase createOrder error: ${error.message}`);
    }
    return { order: data as OrderRecord, created: true };
  }

  async findOrderByProviderId(providerOrderId: string): Promise<OrderRecord | null> {
    const { data, error } = await this.client
      .from("orders")
      .select("*")
      .eq("provider_order_id", providerOrderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as OrderRecord | null) ?? null;
  }

  async listOrders(limit = 100): Promise<OrderRecord[]> {
    const { data, error } = await this.client
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as OrderRecord[]) ?? [];
  }

  async createRedeemCode(input: CreateRedeemCodeInput): Promise<RedeemCodeRecord> {
    for (let attempt = 0; attempt < 6; attempt++) {
      const code =
        attempt === 0 && input.customCode
          ? input.customCode.trim().toUpperCase()
          : generateRedeemCode();
      const { data, error } = await this.client
        .from("redeem_codes")
        .insert({
          code,
          order_id: input.order_id ?? null,
          tier: input.tier,
          max_guests: input.max_guests,
          customer_email: input.customer_email ?? null,
          status: "unused",
          note: input.note ?? null,
        })
        .select()
        .single();
      if (!error && data) return data as RedeemCodeRecord;
      if (error && error.code !== "23505") {
        throw new Error(`Supabase createRedeemCode error: ${error.message}`);
      }
    }
    throw new Error("Could not generate a unique redeem code");
  }

  async findRedeemCodeByCode(code: string): Promise<RedeemCodeRecord | null> {
    const { data, error } = await this.client
      .from("redeem_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as RedeemCodeRecord | null) ?? null;
  }

  async findRedeemCodeByOrderId(orderId: string): Promise<RedeemCodeRecord | null> {
    const { data, error } = await this.client
      .from("redeem_codes")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as RedeemCodeRecord | null) ?? null;
  }

  async markRedeemCodeUsed(codeId: string): Promise<void> {
    const { error } = await this.client
      .from("redeem_codes")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
      .eq("id", codeId);
    if (error) throw new Error(error.message);
  }

  async listRedeemCodes(limit = 100): Promise<RedeemCodeRecord[]> {
    const { data, error } = await this.client
      .from("redeem_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as RedeemCodeRecord[]) ?? [];
  }

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    for (let attempt = 0; attempt < 6; attempt++) {
      const roomCode = generateRoomCode();
      const { data, error } = await this.client
        .from("events")
        .insert({
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
          allow_guest_collage: input.allow_guest_collage,
          max_guests: input.max_guests,
          photos_expires_at: expires.toISOString(),
        })
        .select()
        .single();
      if (!error && data) return data as EventRecord;
      if (error && error.code !== "23505") {
        throw new Error(`Supabase createEvent error: ${error.message}`);
      }
    }
    throw new Error("Could not create unique event room");
  }

  async findEventById(id: string): Promise<EventRecord | null> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as EventRecord | null) ?? null;
  }

  async findEventByRoomCode(roomCode: string): Promise<EventRecord | null> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("room_code", roomCode.trim().toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as EventRecord | null) ?? null;
  }

  async findEventByHostTokenHash(hash: string): Promise<EventRecord | null> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("host_token_hash", hash)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as EventRecord | null) ?? null;
  }

  async findEventBySecretTokenHash(hash: string): Promise<EventRecord | null> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("secret_token_hash", hash)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as EventRecord | null) ?? null;
  }

  async updateEvent(id: string, patch: UpdateEventPatch): Promise<EventRecord> {
    const { data, error } = await this.client
      .from("events")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as EventRecord;
  }

  async listEvents(limit = 100): Promise<EventRecord[]> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as EventRecord[]) ?? [];
  }

  async deleteEvent(id: string): Promise<void> {
    await this.deleteAllEventSelfies(id);
    const { error } = await this.client.from("events").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async findExpiredPhotoEvents(nowIso: string): Promise<EventRecord[]> {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .is("photos_deleted_at", null)
      .lte("photos_expires_at", nowIso);
    if (error) throw new Error(error.message);
    return (data as EventRecord[]) ?? [];
  }

  async upsertParticipant(
    input: UpsertParticipantInput
  ): Promise<ParticipantRecord> {
    const payload: Record<string, unknown> = {
      event_id: input.event_id,
      guest_token_hash: input.guest_token_hash,
      name: input.name,
      prediction: input.prediction,
      is_removed: false,
    };
    if (input.selfie_path !== undefined) {
      payload.selfie_path = input.selfie_path;
    }

    const { data, error } = await this.client
      .from("participants")
      .upsert(payload, { onConflict: "event_id,guest_token_hash" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ParticipantRecord;
  }

  async listParticipants(eventId: string): Promise<ParticipantRecord[]> {
    const { data, error } = await this.client
      .from("participants")
      .select("*")
      .eq("event_id", eventId)
      .eq("is_removed", false)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as ParticipantRecord[]) ?? [];
  }

  async findParticipantByGuestHash(
    eventId: string,
    guestTokenHash: string
  ): Promise<ParticipantRecord | null> {
    const { data, error } = await this.client
      .from("participants")
      .select("*")
      .eq("event_id", eventId)
      .eq("guest_token_hash", guestTokenHash)
      .eq("is_removed", false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as ParticipantRecord | null) ?? null;
  }

  async removeParticipant(eventId: string, participantId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("participants")
      .update({ is_removed: true })
      .eq("event_id", eventId)
      .eq("id", participantId)
      .select("id");
    if (error) throw new Error(error.message);
    return Array.isArray(data) && data.length > 0;
  }

  async saveSelfie(
    eventId: string,
    fileName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const storagePath = `${eventId}/${fileName}`;
    const { error } = await this.client.storage
      .from(SELFIE_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });
    if (error) throw new Error(`Supabase storage upload error: ${error.message}`);
    return storagePath;
  }

  async getSelfieBuffer(
    eventId: string,
    fileName: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const storagePath = `${eventId}/${fileName}`;
    const { data, error } = await this.client.storage
      .from(SELFIE_BUCKET)
      .download(storagePath);
    if (error || !data) return null;
    const arrayBuf = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuf),
      contentType: data.type || "image/webp",
    };
  }

  async deleteAllEventSelfies(eventId: string): Promise<number> {
    const { data: files } = await this.client.storage
      .from(SELFIE_BUCKET)
      .list(eventId, { limit: 500 });
    let removed = 0;
    if (files && files.length > 0) {
      const paths = files.map((f) => `${eventId}/${f.name}`);
      await this.client.storage.from(SELFIE_BUCKET).remove(paths);
      removed = paths.length;
    }
    await this.client
      .from("participants")
      .update({ selfie_path: null })
      .eq("event_id", eventId);
    return removed;
  }

  async saveDevEmail(
    email: Omit<DevEmailRecord, "id" | "sentAt">
  ): Promise<DevEmailRecord> {
    const list = (globalThis.__civcivDevEmailFallback ??= []);
    const rec: DevEmailRecord = {
      ...email,
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
    };
    list.unshift(rec);
    if (list.length > 30) list.length = 30;
    return rec;
  }

  async listDevEmails(limit = 30): Promise<DevEmailRecord[]> {
    return (globalThis.__civcivDevEmailFallback ?? []).slice(0, limit);
  }
}
