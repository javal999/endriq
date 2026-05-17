import { describe, expect, it, vi } from "vitest";
import { withLlmGuards } from "./withLlmGuards";

/**
 * Locks the canonical guard order:
 *   1. dataHash cache  →  return "cache_hit", fn NOT called, quota NOT touched
 *   2. skipIf          →  return "skipped",   fn NOT called, quota NOT touched
 *   3. quota           →  return "quota_exceeded", fn NOT called
 *   4. normal call     →  fn called, result cached, quota decremented exactly once
 *
 * Refs: PHASE-2.0-ARCHITECTURE.md §5.3.
 */
describe("withLlmGuards — canonical guard order", () => {
  it("scenario 1: cache hit short-circuits before skip/quota/fn", async () => {
    const calls: string[] = [];
    const fn = vi.fn(async () => ({ ok: true }));
    const cacheGet = vi.fn(async (k: string) => {
      calls.push("cacheGet");
      return JSON.stringify({ cached: k });
    });
    const cacheSet = vi.fn(async () => {
      calls.push("cacheSet");
    });
    const skipIf = vi.fn(() => {
      calls.push("skipIf");
      return false;
    });
    const quotaCheck = vi.fn(async () => {
      calls.push("quotaCheck");
      return { allowed: true, remaining: 10 };
    });

    const result = await withLlmGuards(
      "athlete-1",
      "weekly",
      fn,
      { dataHashKey: "h1", skipIf },
      { cacheGet, cacheSet, quotaCheck },
    );

    expect(result).toBe("cache_hit");
    expect(fn).not.toHaveBeenCalled();
    expect(skipIf).not.toHaveBeenCalled();
    expect(quotaCheck).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
    expect(calls).toEqual(["cacheGet"]);
  });

  it("scenario 2: skipIf=true short-circuits before quota/fn (no cache hit)", async () => {
    const calls: string[] = [];
    const fn = vi.fn(async () => ({ ok: true }));
    const cacheGet = vi.fn(async () => {
      calls.push("cacheGet");
      return null;
    });
    const skipIf = vi.fn(() => {
      calls.push("skipIf");
      return true;
    });
    const quotaCheck = vi.fn(async () => {
      calls.push("quotaCheck");
      return { allowed: true, remaining: 10 };
    });

    const result = await withLlmGuards(
      "athlete-1",
      "translate",
      fn,
      { dataHashKey: "h2", skipIf },
      { cacheGet, quotaCheck },
    );

    expect(result).toBe("skipped");
    expect(fn).not.toHaveBeenCalled();
    expect(quotaCheck).not.toHaveBeenCalled();
    expect(calls).toEqual(["cacheGet", "skipIf"]);
  });

  it("scenario 3: quota exhausted blocks fn (cache miss, no skip)", async () => {
    const calls: string[] = [];
    const fn = vi.fn(async () => ({ ok: true }));
    const cacheGet = vi.fn(async () => {
      calls.push("cacheGet");
      return null;
    });
    const skipIf = vi.fn(() => {
      calls.push("skipIf");
      return false;
    });
    const quotaCheck = vi.fn(async () => {
      calls.push("quotaCheck");
      return { allowed: false, remaining: 0 };
    });

    const result = await withLlmGuards(
      "athlete-1",
      "weekly",
      fn,
      { dataHashKey: "h3", skipIf },
      { cacheGet, quotaCheck },
    );

    expect(result).toBe("quota_exceeded");
    expect(fn).not.toHaveBeenCalled();
    expect(calls).toEqual(["cacheGet", "skipIf", "quotaCheck"]);
  });

  it("scenario 4: normal call → fn invoked once, result cached, quota decremented", async () => {
    const calls: string[] = [];
    const value = { sections: { wentWell: "X" } };
    const fn = vi.fn(async () => {
      calls.push("fn");
      return value;
    });
    const cacheGet = vi.fn(async () => {
      calls.push("cacheGet");
      return null;
    });
    const cacheSet = vi.fn(async () => {
      calls.push("cacheSet");
    });
    const quotaCheck = vi.fn(async () => {
      calls.push("quotaCheck");
      return { allowed: true, remaining: 19 };
    });

    const result = await withLlmGuards(
      "athlete-1",
      "weekly",
      fn,
      { dataHashKey: "h4" },
      { cacheGet, cacheSet, quotaCheck },
    );

    expect(result).toEqual(value);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(cacheSet).toHaveBeenCalledWith(
      "llm:athlete-1:weekly:h4",
      JSON.stringify(value),
    );
    // Full sequence asserted by the strict scenario 4 test below.
    expect(quotaCheck).toHaveBeenCalledTimes(1);
  });

  it("scenario 4 (strict): exact call sequence is cacheGet → quotaCheck → fn → cacheSet", async () => {
    const calls: string[] = [];
    const fn = vi.fn(async () => {
      calls.push("fn");
      return { ok: 1 };
    });
    const cacheGet = vi.fn(async () => {
      calls.push("cacheGet");
      return null;
    });
    const cacheSet = vi.fn(async () => {
      calls.push("cacheSet");
    });
    const quotaCheck = vi.fn(async () => {
      calls.push("quotaCheck");
      return { allowed: true, remaining: 5 };
    });

    await withLlmGuards(
      "a",
      "p",
      fn,
      { dataHashKey: "k" },
      { cacheGet, cacheSet, quotaCheck },
    );

    expect(calls).toEqual(["cacheGet", "quotaCheck", "fn", "cacheSet"]);
  });
});

describe("withLlmGuards — edge cases", () => {
  it("does not consult cache when dataHashKey is omitted", async () => {
    const cacheGet = vi.fn(async () => "should-not-be-called");
    const cacheSet = vi.fn();
    const quotaCheck = vi.fn(async () => ({ allowed: true, remaining: 1 }));
    const fn = vi.fn(async () => ({ done: true }));

    const result = await withLlmGuards(
      "a",
      "p",
      fn,
      {},
      { cacheGet, cacheSet, quotaCheck },
    );

    expect(result).toEqual({ done: true });
    expect(cacheGet).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it("bypasses quota when cost=0", async () => {
    const quotaCheck = vi.fn();
    const fn = vi.fn(async () => ({ free: true }));

    const result = await withLlmGuards(
      "a",
      "p",
      fn,
      { cost: 0 },
      { quotaCheck },
    );

    expect(result).toEqual({ free: true });
    expect(quotaCheck).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not throw when cacheSet fails after a successful call", async () => {
    const fn = vi.fn(async () => ({ ok: true }));
    const cacheGet = vi.fn(async () => null);
    const cacheSet = vi.fn(async () => {
      throw new Error("redis down");
    });
    const quotaCheck = vi.fn(async () => ({ allowed: true, remaining: 1 }));

    const result = await withLlmGuards(
      "a",
      "p",
      fn,
      { dataHashKey: "k" },
      { cacheGet, cacheSet, quotaCheck },
    );

    expect(result).toEqual({ ok: true });
  });
});
