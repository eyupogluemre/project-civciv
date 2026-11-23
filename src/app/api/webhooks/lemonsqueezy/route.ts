import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { sendRedeemCodeEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { verifyLemonSqueezyWebhook } from "@/lib/lemonsqueezy";
import { getPlanById, getPlanByLemonVariantId } from "@/lib/plans";
import type { Locale } from "@/lib/types";

interface LemonWebhookPayload {
  meta?: {
    event_name?: string;
    custom_data?: {
      tier?: string;
      locale?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      user_email?: string;
      total?: number;
      currency?: string;
      first_order_item?: {
        variant_id?: number | string;
      };
    };
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSqueezyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name;
  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, ignored: eventName ?? "unknown" });
  }

  const providerOrderId = payload.data?.id ? `ls_${payload.data.id}` : null;
  const email = payload.data?.attributes?.user_email?.trim().toLowerCase();
  if (!providerOrderId || !email) {
    return NextResponse.json(
      { error: "Missing order id or customer email" },
      { status: 400 }
    );
  }

  const customTier = payload.meta?.custom_data?.tier;
  const variantId = payload.data?.attributes?.first_order_item?.variant_id;
  const plan =
    (customTier ? getPlanById(customTier) : undefined) ||
    (variantId ? getPlanByLemonVariantId(String(variantId)) : undefined) ||
    getPlanById("party")!;

  const locale: Locale =
    payload.meta?.custom_data?.locale === "en" ? "en" : "tr";

  const store = getStore();
  const { order, created } = await store.createOrder({
    provider: "lemonsqueezy",
    provider_order_id: providerOrderId,
    customer_email: email,
    tier: plan.id,
    max_guests: plan.maxGuests,
    amount_cents: payload.data?.attributes?.total ?? 0,
    currency: payload.data?.attributes?.currency ?? "USD",
    locale,
  });

  // Idempotent guard: do not create duplicate codes on webhook retries
  if (!created) {
    const existingCode = await store.findRedeemCodeByOrderId(order.id);
    return NextResponse.json({
      ok: true,
      idempotent: true,
      codeCreated: Boolean(existingCode),
    });
  }

  const redeemCode = await store.createRedeemCode({
    order_id: order.id,
    tier: plan.id,
    max_guests: plan.maxGuests,
    customer_email: email,
    note: `Lemon Squeezy ${providerOrderId}`,
  });

  await sendRedeemCodeEmail({
    to: email,
    code: redeemCode.code,
    maxGuests: plan.maxGuests,
    locale,
    appUrl: getAppUrl(request),
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}
