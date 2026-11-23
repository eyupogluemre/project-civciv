import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getStore } from "@/lib/db";
import { sendRedeemCodeEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";

const ResendSchema = z.object({
  code: z.string().min(4).max(16),
  email: z.string().trim().email().optional(),
  locale: z.enum(["tr", "en"]).default("tr"),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ResendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const store = getStore();
  const record = await store.findRedeemCodeByCode(parsed.data.code);
  if (!record) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  const recipient = parsed.data.email?.toLowerCase() || record.customer_email;
  if (!recipient) {
    return NextResponse.json(
      { error: "No email address associated with this code" },
      { status: 400 }
    );
  }

  const result = await sendRedeemCodeEmail({
    to: recipient,
    code: record.code,
    maxGuests: record.max_guests,
    locale: parsed.data.locale,
    appUrl: getAppUrl(request),
  });

  return NextResponse.json({ ok: true, deliveredVia: result.deliveredVia });
}
