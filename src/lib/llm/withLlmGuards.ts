import type { SupabaseClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { checkAndDecrementQuota } from "@/lib/llm/quota";

/**
 * Layered guards around every LLM call site.
 *
 * Canonical guard order (DO NOT reorder — locked by withLlmGuards.test.ts):
 *   1. dataHash   → if cached result matches the input hash, return "cache_hit"
 *   2. skipIf     → if the caller-supplied predicate is true, return "skipped"
 *   3. quota      → if the athlete's monthly quota is exhausted, return "quota_exceeded"
 *   4. invoke fn  → call the LLM, persist the result keyed by dataHash
 *
 * `cacheableSystem` is advisory metadata: it documents that the inner fn
 * passes a stable system prompt to Anthropic's prompt cache. The wrapper
 * itself does not call Anthropic — fn does — so we don't actively use this
 * field; it's preserved in the signature per the architecture contract.
 *
 * Refs: PHASE-2.0-ARCHITECTURE.md §5.3 (A4); PHASE-2.0-BUILD.md T01 (F16).
 */

export type WithLlmGuardsStatus =
  | "cache_hit"
  | "skipped"
  | "quota_exceeded";

export interface WithLlmGuardsOptions {
  /** Hash of the input bundle — if it matches the prior cached call, skip. */
  dataHashKey?: string;
  /** Advisory: the system prompt the inner fn will send to Anthropic with cache_control. */
  cacheableSystem?: string;
  /** Caller predicate — return true to skip the call entirely (e.g. locale doesn't need translation). */
  skipIf?: () => boolean;
  /** Quota cost of this call. Defaults to 1. Set 0 to bypass quota (e.g. dev override). */
  cost?: number;
}

export interface WithLlmGuardsDeps {
  /** Get a previously cached value for (athlete, promptType, dataHashKey). */
  cacheGet?: (key: string) => Promise<string | null>;
  /** Persist a value for (athlete, promptType, dataHashKey). */
  cacheSet?: (key: string, value: string) => Promise<void>;
  /** Override the default quota check (for testing). */
  quotaCheck?: (
    athleteId: string,
    cost: number,
  ) => Promise<{ allowed: boolean; remaining: number }>;
  /** JSON serializer for fn's return value (defaults to JSON.stringify). */
  serialize?: (value: unknown) => string;
  /** JSON deserializer for cached values (defaults to JSON.parse). */
  deserialize?: <T>(value: string) => T;
}

/**
 * Returns either the result of `fn` or a string status sentinel. Callers
 * branch on `typeof result === "string"` to handle skip / cache / quota.
 *
 * Note: T must not overlap with the sentinel strings ("cache_hit",
 * "skipped", "quota_exceeded"). All LLM call sites return objects, so this
 * is safe in practice.
 */
export async function withLlmGuards<T>(
  athleteId: string,
  promptType: string,
  fn: () => Promise<T>,
  options: WithLlmGuardsOptions = {},
  deps: WithLlmGuardsDeps = {},
): Promise<T | WithLlmGuardsStatus> {
  const cost = options.cost ?? 1;
  const cacheKey =
    options.dataHashKey != null
      ? `llm:${athleteId}:${promptType}:${options.dataHashKey}`
      : null;

  // Guard 1 — dataHash cache lookup.
  if (cacheKey != null && deps.cacheGet) {
    const cached = await deps.cacheGet(cacheKey);
    if (cached != null) {
      return "cache_hit";
    }
  }

  // Guard 2 — caller-supplied skip predicate.
  if (options.skipIf && options.skipIf()) {
    return "skipped";
  }

  // Guard 3 — quota.
  if (cost > 0 && deps.quotaCheck) {
    const { allowed } = await deps.quotaCheck(athleteId, cost);
    if (!allowed) {
      return "quota_exceeded";
    }
  }

  // All guards passed — invoke the underlying call.
  const result = await fn();

  // Persist the result for future cache hits.
  if (cacheKey != null && deps.cacheSet) {
    const serialize = deps.serialize ?? JSON.stringify;
    try {
      await deps.cacheSet(cacheKey, serialize(result));
    } catch {
      // Cache persistence failures must never break the live call.
    }
  }

  return result;
}

/**
 * Default production deps — wires Upstash Redis (cache) + Supabase RPC (quota).
 *
 * Returns a no-op cache when Upstash credentials are absent (matches the
 * graceful-fallthrough pattern in src/lib/ratelimit.ts). Without a cache,
 * the guard still runs skip + quota correctly; only dataHash short-circuit
 * is disabled.
 */
export function defaultLlmGuardDeps(db: SupabaseClient): WithLlmGuardsDeps {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  let cacheGet: WithLlmGuardsDeps["cacheGet"];
  let cacheSet: WithLlmGuardsDeps["cacheSet"];

  if (url && token) {
    const redis = new Redis({ url, token });
    const ttlSeconds = 60 * 60 * 24 * 7; // 7-day cache window
    cacheGet = async (key) => (await redis.get<string>(key)) ?? null;
    cacheSet = async (key, value) => {
      await redis.set(key, value, { ex: ttlSeconds });
    };
  }

  return {
    cacheGet,
    cacheSet,
    quotaCheck: (athleteId, cost) =>
      checkAndDecrementQuota(athleteId, cost, db),
  };
}
