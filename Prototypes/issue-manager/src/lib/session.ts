/**
 * Cookie session for write-protected routes. Uses Web Crypto (Edge middleware + Node routes).
 * Set ISSUE_MANAGER_PASSWORD for login; optional ISSUE_MANAGER_SESSION_SECRET signs cookies (defaults to password).
 */

export const AUTH_COOKIE_NAME = "im_session";

const MAX_AGE_SEC = 7 * 24 * 60 * 60;

function signingSecret(): string | undefined {
  return (
    process.env.ISSUE_MANAGER_SESSION_SECRET?.trim() ||
    process.env.ISSUE_MANAGER_PASSWORD?.trim() ||
    undefined
  );
}

export function isAuthEnabled(): boolean {
  return Boolean(process.env.ISSUE_MANAGER_PASSWORD?.trim());
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function signSessionCookieValue(): Promise<string | null> {
  const secret = signingSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = String(exp);
  const sig = await hmacSha256Hex(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionCookieValue(
  token: string | undefined,
): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  const secret = signingSecret();
  if (!secret) return false;
  const lastDot = token.lastIndexOf(".");
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const exp = parseInt(payload, 10);
  if (Number.isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacSha256Hex(secret, payload);
  return timingSafeEqualHex(sig, expected);
}
