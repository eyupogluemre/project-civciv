import { cookies } from "next/headers";
import { verifyAdminToken } from "./crypto";
import { getAdminSecret } from "./env";

export const ADMIN_COOKIE_NAME = "civciv_admin_session";

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token, secret);
}
