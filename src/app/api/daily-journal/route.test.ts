/**
 * Validation tests for /api/daily-journal. Exercise the asNullableBool
 * helper indirectly via response codes — we keep the test runtime fast
 * by stubbing out the supabase client and rate limiter at module level.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "00000000-0000-0000-0000-000000000001" } } }),
    },
    from: () => ({
      upsert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: "j1",
                check_in_date: "2026-05-17",
                slept_well: true,
                travelling: null,
                stressed: null,
              },
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkLimit: vi.fn().mockResolvedValue({ allowed: true }),
  raceWriteLimit: {},
}));

async function call(body: unknown): Promise<Response> {
  const mod = await import("@/app/api/daily-journal/route");
  return mod.POST(
    new Request("https://example.com/api/daily-journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("/api/daily-journal POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing date", async () => {
    const res = await call({ slept_well: true });
    expect(res.status).toBe(400);
  });

  it("rejects invalid date format", async () => {
    const res = await call({ check_in_date: "yesterday", slept_well: true });
    expect(res.status).toBe(400);
  });

  it("rejects when no tags supplied", async () => {
    const res = await call({ check_in_date: "2026-05-17" });
    expect(res.status).toBe(400);
  });

  it("accepts a single tag", async () => {
    const res = await call({ check_in_date: "2026-05-17", slept_well: true });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});
