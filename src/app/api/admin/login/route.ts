import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { safeCompareSecret, signAdminToken } from "@/lib/crypto";
import { getAdminSecret } from "@/lib/env";

const LoginSchema = z.object({
  secret: z.string().min(1),
});

export async function POST(request: Request) {
  const expected = getAdminSecret();
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_SECRET is not configured on the server." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing secret" }, { status: 400 });
  }

  if (!safeCompareSecret(parsed.data.secret.trim(), expected)) {
    return NextResponse.json({ error: "Invalid admin secret" }, { status: 401 });
  }

  const token = signAdminToken(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
