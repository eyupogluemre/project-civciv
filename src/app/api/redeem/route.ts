import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSecretToken, sha256Hex } from "@/lib/crypto";
import { getStore } from "@/lib/db";
import { sendHostRecoveryEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";

const RedeemSchema = z.object({
  code: z.string().min(4).max(16),
  title: z.string().trim().min(2).max(80),
  hostEmail: z.string().trim().email().optional().or(z.literal("")),
  locale: z.enum(["tr", "en"]).default("tr"),
  genderMode: z.enum(["host", "secret_keeper"]),
  trueGender: z.enum(["boy", "girl"]).nullable().optional(),
  countdownSeconds: z.number().int().min(3).max(30).default(10),
  allowGuestCollage: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RedeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event configuration", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      code,
      title,
      hostEmail,
      locale,
      genderMode,
      trueGender,
      countdownSeconds,
      allowGuestCollage,
    } = parsed.data;

    if (genderMode === "host" && !trueGender) {
      return NextResponse.json(
        { error: "trueGender is required when genderMode is host" },
        { status: 400 }
      );
    }

    const store = getStore();
    const redeemRecord = await store.findRedeemCodeByCode(code);
    if (!redeemRecord) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (redeemRecord.status !== "unused") {
      return NextResponse.json({ error: redeemRecord.status }, { status: 409 });
    }

    const hostToken = generateSecretToken(24);
    const hostTokenHash = sha256Hex(hostToken);

    const secretToken =
      genderMode === "secret_keeper" ? generateSecretToken(24) : null;
    const secretTokenHash = secretToken ? sha256Hex(secretToken) : null;

    const resolvedEmail =
      hostEmail && hostEmail.length > 0
        ? hostEmail.toLowerCase()
        : redeemRecord.customer_email;

    const event = await store.createEvent({
      redeem_code_id: redeemRecord.id,
      host_token_hash: hostTokenHash,
      secret_token_hash: secretTokenHash,
      host_email: resolvedEmail,
      title,
      locale,
      gender_mode: genderMode,
      true_gender: genderMode === "host" ? (trueGender ?? null) : null,
      countdown_seconds: countdownSeconds,
      allow_guest_collage: allowGuestCollage,
      max_guests: redeemRecord.max_guests,
    });

    await store.markRedeemCodeUsed(redeemRecord.id);

    const appUrl = getAppUrl(request);
    const hostUrl = `${appUrl}/host/${hostToken}`;
    const secretUrl = secretToken ? `${appUrl}/secret/${secretToken}` : null;

    if (resolvedEmail) {
      try {
        await sendHostRecoveryEmail({
          to: resolvedEmail,
          eventTitle: event.title,
          roomCode: event.room_code,
          hostUrl,
          secretUrl,
          locale,
        });
      } catch {
        // Non-fatal: host still gets immediate redirect token in response
      }
    }

    return NextResponse.json({
      eventId: event.id,
      roomCode: event.room_code,
      hostToken,
      secretToken,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Redeem failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
