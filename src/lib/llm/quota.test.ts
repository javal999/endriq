import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndDecrementQuota } from "./quota";

function mockClient(
  response: { data: unknown; error: { message: string } | null },
): { db: SupabaseClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn().mockResolvedValue(response);
  const db = { rpc } as unknown as SupabaseClient;
  return { db, rpc };
}

describe("checkAndDecrementQuota", () => {
  it("returns allowed=true with remaining when RPC succeeds", async () => {
    const { db, rpc } = mockClient({
      data: [{ allowed: true, remaining: 17 }],
      error: null,
    });
    const r = await checkAndDecrementQuota("athlete-123", 1, db);
    expect(r).toEqual({ allowed: true, remaining: 17 });
    expect(rpc).toHaveBeenCalledWith("decrement_llm_quota", {
      p_athlete_id: "athlete-123",
      p_cost: 1,
    });
  });

  it("returns allowed=false when quota is exhausted", async () => {
    const { db } = mockClient({
      data: [{ allowed: false, remaining: 0 }],
      error: null,
    });
    const r = await checkAndDecrementQuota("athlete-1", 1, db);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("handles RPC returning a single object (not an array)", async () => {
    const { db } = mockClient({
      data: { allowed: true, remaining: 5 },
      error: null,
    });
    const r = await checkAndDecrementQuota("athlete-1", 1, db);
    expect(r).toEqual({ allowed: true, remaining: 5 });
  });

  it("throws on negative or non-integer cost", async () => {
    const { db } = mockClient({ data: [], error: null });
    await expect(checkAndDecrementQuota("a", -1, db)).rejects.toThrow();
    await expect(checkAndDecrementQuota("a", 1.5, db)).rejects.toThrow();
  });

  it("throws when the RPC errors", async () => {
    const { db } = mockClient({
      data: null,
      error: { message: "function not found" },
    });
    await expect(checkAndDecrementQuota("a", 1, db)).rejects.toThrow(
      /decrement_llm_quota failed/,
    );
  });

  it("throws on unexpected RPC shape", async () => {
    const { db } = mockClient({ data: [{}], error: null });
    await expect(checkAndDecrementQuota("a", 1, db)).rejects.toThrow();
  });
});
