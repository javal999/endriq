import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Atomic check + decrement of an athlete's monthly LLM call quota.
 *
 * Backed by the SQL function decrement_llm_quota() (migration 020) so the
 * read-check-write happens in a single transaction, immune to interleaved
 * calls. The function also rolls the monthly window when quota_reset_at
 * has passed.
 *
 * Returns { allowed, remaining } — callers branch on `allowed`.
 *
 * Refs: PHASE-2.0-ARCHITECTURE.md §5.3; PHASE-2.0-BUILD.md T01 (F16.B).
 */
export interface QuotaResult {
  allowed: boolean;
  remaining: number;
}

export async function checkAndDecrementQuota(
  athleteId: string,
  cost: number,
  db: SupabaseClient,
): Promise<QuotaResult> {
  if (!Number.isInteger(cost) || cost < 0) {
    throw new Error(`cost must be a non-negative integer (got ${cost})`);
  }

  const { data, error } = await db.rpc("decrement_llm_quota", {
    p_athlete_id: athleteId,
    p_cost: cost,
  });

  if (error) {
    throw new Error(`decrement_llm_quota failed: ${error.message}`);
  }

  // Supabase RPC returning TABLE returns an array of rows.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("decrement_llm_quota returned unexpected shape");
  }

  return {
    allowed: row.allowed,
    remaining: Number(row.remaining ?? 0),
  };
}
