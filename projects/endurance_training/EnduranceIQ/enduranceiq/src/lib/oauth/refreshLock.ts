/**
 * Advisory lock for OAuth token refresh.
 *
 * Prevents concurrent webhook + manual sync from both attempting a token
 * refresh at the same time. The second caller blocks until the first finishes,
 * then re-reads the now-fresh token from the DB rather than refreshing again.
 *
 * Uses PostgreSQL pg_advisory_xact_lock (transaction-scoped) via Supabase admin RPC.
 * The lock is automatically released when the transaction ends.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/**
 * Convert an athlete UUID to a stable 32-bit integer for pg_advisory_xact_lock.
 * Uses the first 4 bytes of MD5(athleteId) to avoid collisions across users.
 */
export function athleteIdToLockKey(athleteId: string): number {
  const hash = crypto.createHash("md5").update(athleteId).digest();
  // Read as signed 32-bit int (Postgres bigint parameter accepts any int)
  return hash.readInt32BE(0);
}

/**
 * Acquire an advisory lock scoped to this athlete's token refresh,
 * run `fn`, then release automatically when the RPC call completes.
 *
 * Falls back to running `fn` without a lock if the RPC fails (e.g., missing permission)
 * so we don't hard-fail on environments without advisory lock support.
 */
export async function withAthleteRefreshLock<T>(
  admin: SupabaseClient,
  athleteId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = athleteIdToLockKey(athleteId);
  try {
    // pg_advisory_lock blocks until the lock is available (no xact variant via RPC)
    await admin.rpc("pg_advisory_lock", { key });
  } catch {
    // Advisory lock unavailable — run without lock (degraded but functional)
    console.warn("[EnduranceIQ] Advisory lock unavailable — proceeding without lock");
    return fn();
  }

  try {
    return await fn();
  } finally {
    try {
      await admin.rpc("pg_advisory_unlock", { key });
    } catch {
      // Best-effort unlock; Postgres will release on connection close anyway
    }
  }
}
