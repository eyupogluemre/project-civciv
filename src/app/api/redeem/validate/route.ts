import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";

const ValidateSchema = z.object({
  code: z.string().min(4).max(16),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ValidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ valid: false, reason: "invalid" }, { status: 400 });
    }

    const store = getStore();
    const record = await store.findRedeemCodeByCode(parsed.data.code);
    if (!record) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }
    if (record.status === "redeemed") {
      return NextResponse.json({ valid: false, reason: "used" }, { status: 409 });
    }
    if (record.status === "revoked") {
      return NextResponse.json({ valid: false, reason: "revoked" }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      code: record.code,
      tier: record.tier,
      maxGuests: record.max_guests,
      email: record.customer_email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
