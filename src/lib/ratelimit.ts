/**
 * Rate limiting using Upstash Redis + @upstash/ratelimit.
 *
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment.
 * When these are not set (local dev without Redis), the limiters are null and
 * all check() calls return { allowed: true } so the app still runs.
 *
 * Set up a free Redis database at upstash.com.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function makeRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function makeLimiter(
  redis: Redis | null,
  requests: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: "eiq_rl",
  });
}

const redis = makeRedis();

/** LLM feedback: 10 requests per minute per user. */
export const llmFeedbackLimit = makeLimiter(redis, 10, "1 m");

/** Strava sync: 3 requests per 5 minutes per user. */
export const stravaSyncLimit = makeLimiter(redis, 3, "5 m");

/** COROS sync: 3 requests per 5 minutes per user. */
export const corosSyncLimit = makeLimiter(redis, 3, "5 m");

/** Share card renders: 30 requests per minute by IP. */
export const shareCardLimit = makeLimiter(redis, 30, "1 m");

/** Race CRUD writes (POST/PATCH/DELETE): 20 per minute per user. */
export const raceWriteLimit = makeLimiter(redis, 20, "1 m");

/**
 * Check a rate limit. Returns { allowed: true } when the limiter is null
 * (Redis not configured) so the app degrades gracefully.
 */
export async function checkLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<{ allowed: boolean; remaining?: number }> {
  if (!limiter) return { allowed: true };
  const result = await limiter.limit(key);
  return { allowed: result.success, remaining: result.remaining };
}
