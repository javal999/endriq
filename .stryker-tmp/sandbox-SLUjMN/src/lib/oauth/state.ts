/**
 * OAuth state parameter — signed, expiring, nonce-bound.
 *
 * Prevents CSRF on OAuth callbacks by:
 *   1. Signing with STATE_SIGNING_SECRET so the server can verify it wasn't forged.
 *   2. Embedding a nonce stored in an httpOnly cookie so the state is bound to
 *      the originating browser session.
 *   3. Embedding an expiry so stale states are rejected.
 *
 * Format (base64url):  JSON { userId, nonce, exp }  +  "."  +  HMAC-SHA256 (hex)
 */
// @ts-nocheck


import crypto from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const STATE_COOKIE = "eiq_oauth_state";

interface StatePayload {
  userId: string;
  nonce: string;
  exp: number; // unix ms
}

function getSecret(): string {
  const s = process.env.STATE_SIGNING_SECRET?.trim();
  if (!s) throw new Error("STATE_SIGNING_SECRET is not set");
  return s;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Generate a signed state string + the nonce to store in the cookie.
 * Call on the connect route; set `nonce` in the cookie before redirecting.
 */
export function signState(userId: string): { state: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + STATE_TTL_MS;
  const payload: StatePayload = { userId, nonce, exp };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(payloadB64, getSecret());
  return { state: `${payloadB64}.${sig}`, nonce };
}

/**
 * Verify an incoming state parameter from an OAuth callback.
 * Returns the verified `userId` or throws a descriptive error.
 *
 * @param stateParam   The `state` query param from the callback URL.
 * @param cookieNonce  Value of the `eiq_oauth_state` httpOnly cookie.
 * @param currentUserId  Logged-in user's ID (must match the state payload).
 */
export function verifyState(
  stateParam: string,
  cookieNonce: string | undefined,
  currentUserId: string,
): string {
  const [payloadB64, sig] = stateParam.split(".");
  if (!payloadB64 || !sig) throw new Error("malformed_state");

  const expected = sign(payloadB64, getSecret());
  if (
    !crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex"),
    )
  ) {
    throw new Error("invalid_state_signature");
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    ) as StatePayload;
  } catch {
    throw new Error("malformed_state_payload");
  }

  if (Date.now() > payload.exp) throw new Error("state_expired");
  if (!cookieNonce || cookieNonce !== payload.nonce) throw new Error("nonce_mismatch");
  if (payload.userId !== currentUserId) throw new Error("user_mismatch");

  return payload.userId;
}
