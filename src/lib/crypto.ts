import crypto from "node:crypto";

/**
 * Unambiguous uppercase alphanumeric alphabet (excludes 0/O and 1/I/L).
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateUnambiguousCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function generateRedeemCode(): string {
  return generateUnambiguousCode(8);
}

export function generateRoomCode(): string {
  return generateUnambiguousCode(6);
}

export function generateSecretToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function verifyHmacSha256(
  rawBody: string,
  signatureHex: string,
  secret: string
): boolean {
  if (!signatureHex || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHex.trim(), "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export function signAdminToken(secret: string): string {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`civciv-admin:${issuedAt}`)
    .digest("hex");
  return `${issuedAt}.${sig}`;
}

export function verifyAdminToken(token: string | undefined, secret: string): boolean {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [issuedAt, sig] = parts;
  const issuedSec = Number.parseInt(issuedAt, 10);
  if (!Number.isFinite(issuedSec)) return false;
  // Valid for 12 hours
  const ageSec = Math.floor(Date.now() / 1000) - issuedSec;
  if (ageSec < 0 || ageSec > 60 * 60 * 12) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`civciv-admin:${issuedAt}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function safeCompareSecret(input: string, expected: string): boolean {
  const a = Buffer.from(sha256Hex(input), "utf8");
  const b = Buffer.from(sha256Hex(expected), "utf8");
  return crypto.timingSafeEqual(a, b);
}
