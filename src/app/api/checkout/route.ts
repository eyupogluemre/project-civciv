import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl } from "@/lib/env";
import { createCheckoutSession } from "@/lib/lemonsqueezy";

const CheckoutSchema = z.object({
  tier: z.enum(["mini", "party", "mega"]),
  email: z.string().email(),
  locale: z.enum(["tr", "en"]).default("tr"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await createCheckoutSession({
      tier: parsed.data.tier,
      email: parsed.data.email.trim().toLowerCase(),
      locale: parsed.data.locale,
      appUrl: getAppUrl(request),
    });

    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
