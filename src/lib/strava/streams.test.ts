import { describe, it, expect, vi } from "vitest";
import {
  fetchActivityStreams,
  fetchActivityStreamsDetailed,
} from "@/lib/strava/streams";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("fetchActivityStreams", () => {
  it("returns streams on a 200 with heartrate/distance/time", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        heartrate: { data: [140, 142, 145] },
        distance: { data: [0, 100, 200] },
        time: { data: [0, 30, 60] },
      }),
    );
    const out = await fetchActivityStreams(12345, "tok", { fetchFn });
    expect(out).not.toBeNull();
    expect(out?.heartrate).toEqual([140, 142, 145]);
    expect(out?.distance).toEqual([0, 100, 200]);
    expect(out?.time).toEqual([0, 30, 60]);
  });

  it("returns null on 404 (no streams for activity)", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(404, {}));
    const out = await fetchActivityStreams(12345, "tok", { fetchFn });
    expect(out).toBeNull();
  });

  it("returns null on 401 (auth failure surfaces to caller via null)", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(401, {}));
    const out = await fetchActivityStreams(12345, "tok", { fetchFn });
    expect(out).toBeNull();
  });

  it("retries once on 429 with Retry-After, then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("", {
          status: 429,
          headers: { "retry-after": "1" }, // 1 second
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          heartrate: { data: [150] },
          distance: { data: [0] },
          time: { data: [0] },
        }),
      );
    const out = await fetchActivityStreams(12345, "tok", { fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(out).not.toBeNull();
  });

  it("gives up after one 429 retry", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        new Response("", {
          status: 429,
          headers: { "retry-after": "1" },
        }),
      );
    const out = await fetchActivityStreams(12345, "tok", { fetchFn });
    // Two attempts max; both 429.
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(out).toBeNull();
  });

  it("returns unavailable when 200 has empty payload", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { heartrate: { data: [] } }));
    const detailed = await fetchActivityStreamsDetailed(12345, "tok", { fetchFn });
    expect(detailed.kind).toBe("unavailable");
  });

  it("treats network exceptions as failures", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("EAI_AGAIN"));
    const detailed = await fetchActivityStreamsDetailed(12345, "tok", { fetchFn });
    expect(detailed.kind).toBe("failed");
  });

  it("reports 401 as a failed outcome (not unavailable)", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(401, {}));
    const detailed = await fetchActivityStreamsDetailed(12345, "tok", { fetchFn });
    expect(detailed.kind).toBe("failed");
    if (detailed.kind === "failed") expect(detailed.status).toBe(401);
  });
});
