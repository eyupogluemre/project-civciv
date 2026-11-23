import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { sendRedeemCodeEmail } from "@/lib/email";
import { getAppUrl, isLemonSqueezyConfigured } from "@/lib/env";
import { getLemonVariantId, getPlanById } from "@/lib/plans";

const MockCompleteSchema = z.object({
  tier: z.enum(["mini", "party", "mega"]),
  email: z.string().email(),
  locale: z.enum(["tr", "en"]).default("tr"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = MockCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const plan = getPlanById(parsed.data.tier);
    if (!plan) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    // Disallow mock payment bypass in production when Lemon Squeezy is fully configured
    if (isLemonSqueezyConfigured() && getLemonVariantId(plan.id)) {
      return NextResponse.json(
        { error: "Mock checkout is disabled when Lemon Squeezy is configured." },
        { status: 403 }
      );
    }

    const store = getStore();
    const email = parsed.data.email.trim().toLowerCase();
    const currency = parsed.data.locale === "tr" ? "TRY" : "USD";
    const amountCents =
      (parsed.data.locale === "tr" ? plan.priceTry : plan.priceUsd) * 100;

    const { order } = await store.createOrder({
      provider: "mock",
      provider_order_id: `mock_${crypto.randomUUID()}`,
      customer_email: email,
      tier: plan.id,
      max_guests: plan.maxGuests,
      amount_cents: amountCents,
      currency,
      locale: parsed.data.locale,
    });

    const redeemCode = await store.createRedeemCode({
      order_id: order.id,
      tier: plan.id,
      max_guests: plan.maxGuests,
      customer_email: email,
      note: "Mock Checkout Order",
    });

    const delivery = await sendRedeemCodeEmail({
      to: email,
      code: redeemCode.code,
      maxGuests: plan.maxGuests,
      locale: parsed.data.locale,
      appUrl: getAppUrl(request),
    });

    return NextResponse.json({
      orderId: order.id,
      code: redeemCode.code,
      tier: plan.id,
      maxGuests: plan.maxGuests,
      deliveredVia: delivery.deliveredVia,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mock checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
