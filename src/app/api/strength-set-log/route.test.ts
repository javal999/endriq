/** Validation tests for /api/strength-set-log (T09). */

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
                id: "s1",
                exercise_id: "back_squat",
                set_number: 1,
                weight_kg: 60,
                reps: 8,
                rpe: 7,
                logged_at: "2026-05-17T10:00:00Z",
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
  const mod = await import("@/app/api/strength-set-log/route");
  return mod.POST(
    new Request("https://example.com/api/strength-set-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("/api/strength-set-log POST", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects missing exercise_id", async () => {
    const res = await call({ set_number: 1 });
    expect(res.status).toBe(400);
  });

  it("rejects set_number out of range", async () => {
    const res = await call({ exercise_id: "back_squat", set_number: 99 });
    expect(res.status).toBe(400);
  });

  it("rejects RPE out of range", async () => {
    const res = await call({ exercise_id: "back_squat", set_number: 1, rpe: 12 });
    expect(res.status).toBe(400);
  });

  it("accepts a valid set log", async () => {
    const res = await call({
      exercise_id: "back_squat",
      set_number: 1,
      weight_kg: 60,
      reps: 8,
      rpe: 7,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("accepts a set with no weight/reps/rpe (skip-set)", async () => {
    const res = await call({ exercise_id: "back_squat", set_number: 1 });
    expect(res.status).toBe(200);
  });
});
