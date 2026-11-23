import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getStore } from "@/lib/db";
import { sendRedeemCodeEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { getPlanById } from "@/lib/plans";

const CreateCodeSchema = z.object({
  tier: z.enum(["mini", "party", "mega"]),
  email: z.string().trim().email().optional().or(z.literal("")),
  note: z.string().trim().max(120).optional(),
  locale: z.enum(["tr", "en"]).default("tr"),
  sendEmail: z.boolean().default(true),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const plan = getPlanById(parsed.data.tier)!;
  const store = getStore();
  const email =
    parsed.data.email && parsed.data.email.length > 0
      ? parsed.data.email.toLowerCase()
      : null;

  const created = await store.createRedeemCode({
    tier: plan.id,
    max_guests: plan.maxGuests,
    customer_email: email,
    note: parsed.data.note || "Manual admin code",
  });

  let emailDeliveredVia: string | null = null;
  if (email && parsed.data.sendEmail) {
    const res = await sendRedeemCodeEmail({
      to: email,
      code: created.code,
      maxGuests: plan.maxGuests,
      locale: parsed.data.locale,
      appUrl: getAppUrl(request),
    });
    emailDeliveredVia = res.deliveredVia;
  }

  return NextResponse.json({ code: created, emailDeliveredVia });
}
