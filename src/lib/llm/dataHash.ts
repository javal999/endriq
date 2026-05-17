import { createHash } from "node:crypto";

/**
 * Stable SHA-256 hash of an LLM input bundle.
 *
 * Used as the cache key by withLlmGuards — if the bundle hash matches the
 * previously stored hash for (athlete, prompt_type), the LLM call can be
 * skipped and the cached output returned.
 *
 * Determinism contract:
 *   - Object keys are sorted recursively before serialization.
 *   - Arrays preserve order (order is meaningful in workout/session lists).
 *   - Output is hex-encoded; same input → same hash across runs and machines.
 *
 * Refs: PHASE-2.0-ARCHITECTURE.md §5.3; PHASE-2.0-BUILD.md T01.
 */
export function dataHash(input: unknown): string {
  return createHash("sha256").update(canonicalStringify(input)).digest("hex");
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of sortedKeys) out[k] = canonicalize(obj[k]);
  return out;
}
