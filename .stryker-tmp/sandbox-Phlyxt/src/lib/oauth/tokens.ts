/**
 * OAuth token encryption at rest — AES-256-GCM.
 *
 * Uses TOKEN_ENCRYPTION_KEY (32-byte hex string) from environment.
 * Output format: "<iv_hex>:<ciphertext_hex>:<tag_hex>" stored as TEXT.
 *
 * Key rotation: generate a new key, re-encrypt all rows via the backfill
 * script in scripts/encrypt-tokens.ts, then swap the env var.
 */
// @ts-nocheck


import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    // When no key is set, encryption is a no-op (tokens stored in plaintext).
    // Warn in non-test environments.
    if (process.env.NODE_ENV === "production") {
      console.warn("[EnduranceIQ] TOKEN_ENCRYPTION_KEY is not set — tokens stored in plaintext.");
    }
    return Buffer.alloc(32); // zero key — still runs, just not secure
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars); got ${buf.length} bytes`);
  }
  return buf;
}

/** Encrypt a plaintext token. Returns null when input is null/empty. */
export function encryptToken(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${ciphertext.toString("hex")}:${tag.toString("hex")}`;
}

/** Decrypt a stored encrypted token. Returns null on any failure. */
export function decryptToken(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    const parts = enc.split(":");
    if (parts.length !== 3) return null;
    const [ivHex, ctHex, tagHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const ciphertext = Buffer.from(ctHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Read a token from a DB row: prefer encrypted column, fall back to plaintext. */
export function readToken(
  enc: string | null | undefined,
  plain: string | null | undefined,
): string {
  const decrypted = decryptToken(enc);
  if (decrypted) return decrypted;
  if (plain) return plain;
  throw new Error("No token available (both encrypted and plaintext are missing)");
}
