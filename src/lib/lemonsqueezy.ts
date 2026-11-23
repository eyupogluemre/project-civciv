import { verifyHmacSha256 } from "./crypto";
import { isLemonSqueezyConfigured } from "./env";
import { getLemonVariantId, getPlanById } from "./plans";
import type { Locale, TierId } from "./types";

export interface CheckoutSessionResult {
  mode: "lemonsqueezy" | "mock";
  checkoutUrl?: string;
  tier: TierId;
  maxGuests: number;
  amountCents: number;
  currency: string;
}

export async function createCheckoutSession(params: {
  tier: TierId;
  email: string;
  locale: Locale;
  appUrl: string;
}): Promise<CheckoutSessionResult> {
  const plan = getPlanById(params.tier);
  if (!plan) throw new Error("Invalid tier");

  const currency = params.locale === "tr" ? "TRY" : "USD";
  const amountCents = (params.locale === "tr" ? plan.priceTry : plan.priceUsd) * 100;

  if (!isLemonSqueezyConfigured()) {
    return {
      mode: "mock",
      tier: plan.id,
      maxGuests: plan.maxGuests,
      amountCents,
      currency,
    };
  }

  const variantId = getLemonVariantId(plan.id);
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!.trim();
  const apiKey = process.env.LEMONSQUEEZY_API_KEY!.trim();

  if (!variantId) {
    // Graceful fallback if store key exists but specific variant ID isn't configured yet
    return {
      mode: "mock",
      tier: plan.id,
      maxGuests: plan.maxGuests,
      amountCents,
      currency,
    };
  }

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_options: {
            embed: true,
            dark: true,
          },
          checkout_data: {
            email: params.email,
            custom: {
              tier: plan.id,
              locale: params.locale,
            },
          },
          product_options: {
            redirect_url: `${params.appUrl}/redeem?purchased=1`,
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: storeId },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Lemon Squeezy checkout failed (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const checkoutUrl = json.data?.attributes?.url;
  if (!checkoutUrl) {
    throw new Error("Lemon Squeezy did not return a checkout URL");
  }

  return {
    mode: "lemonsqueezy",
    checkoutUrl,
    tier: plan.id,
    maxGuests: plan.maxGuests,
    amountCents,
    currency,
  };
}

export function verifyLemonSqueezyWebhook(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;
  return verifyHmacSha256(rawBody, signatureHeader, secret);
}
