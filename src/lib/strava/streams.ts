/**
 * Strava Streams API client.
 *
 * Fetches the heartrate, distance, and time streams for one activity.
 * Returns `null` when the activity has no streams (404) or the request
 * fails after retries — callers persist `streams_status='unavailable'`
 * or `'failed'` respectively so they don't repeatedly retry.
 *
 * Rate-limit handling:
 *   - 429: respect `Retry-After` once, then give up.
 *   - 401: caller is responsible for refresh — this function does NOT
 *     refresh tokens; the sync layer already owns refresh.
 *
 * Refs: PHASE-2.1-BUILD.md §6 T10 step 2.
 */

export type StreamResolution = "low" | "medium" | "high";

export interface ActivityStreams {
  heartrate: number[];
  /** Cumulative metres since activity start. */
  distance: number[];
  /** Seconds since activity start. */
  time: number[];
  resolution: StreamResolution;
}

export type StreamsFetchOutcome =
  | { kind: "ok"; streams: ActivityStreams }
  | { kind: "unavailable"; status: number; reason: string }
  | { kind: "failed"; status: number; reason: string };

/**
 * `fetchActivityStreams` returns the streams or null on miss. For richer
 * status reporting (so callers can persist `streams_status` accurately),
 * use `fetchActivityStreamsDetailed`.
 */
export async function fetchActivityStreams(
  activityId: number,
  accessToken: string,
  opts: { fetchFn?: typeof fetch; resolution?: StreamResolution } = {},
): Promise<ActivityStreams | null> {
  const detailed = await fetchActivityStreamsDetailed(
    activityId,
    accessToken,
    opts,
  );
  return detailed.kind === "ok" ? detailed.streams : null;
}

export async function fetchActivityStreamsDetailed(
  activityId: number,
  accessToken: string,
  opts: { fetchFn?: typeof fetch; resolution?: StreamResolution } = {},
): Promise<StreamsFetchOutcome> {
  const fetchFn = opts.fetchFn ?? fetch;
  const resolution = opts.resolution ?? "medium";
  const url =
    `https://www.strava.com/api/v3/activities/${activityId}/streams` +
    `?keys=heartrate,distance,time&key_by_type=true&resolution=${resolution}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res: Response;
    try {
      res = await fetchFn(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      return {
        kind: "failed",
        status: 0,
        reason: e instanceof Error ? e.message : "network error",
      };
    }

    if (res.status === 200) {
      const json = (await res.json().catch(() => null)) as
        | Record<string, { data?: unknown }>
        | null;
      if (!json) {
        return { kind: "failed", status: 200, reason: "non-JSON body" };
      }
      const heartrate = pickNumberArray(json.heartrate?.data);
      const distance = pickNumberArray(json.distance?.data);
      const time = pickNumberArray(json.time?.data);
      if (heartrate.length === 0 || distance.length === 0 || time.length === 0) {
        // 200 with no HR data — e.g. activity recorded without HRM
        return {
          kind: "unavailable",
          status: 200,
          reason: "stream payload missing heartrate/distance/time",
        };
      }
      return {
        kind: "ok",
        streams: { heartrate, distance, time, resolution },
      };
    }

    if (res.status === 404) {
      return { kind: "unavailable", status: 404, reason: "no streams" };
    }
    if (res.status === 401) {
      return {
        kind: "failed",
        status: 401,
        reason: "unauthorized — refresh token",
      };
    }
    if (res.status === 429 && attempt === 0) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "0");
      const waitMs = Number.isFinite(retryAfter)
        ? Math.min(60_000, Math.max(1000, retryAfter * 1000))
        : 15_000;
      await sleep(waitMs);
      continue;
    }
    return { kind: "failed", status: res.status, reason: `HTTP ${res.status}` };
  }

  return { kind: "failed", status: 429, reason: "rate limited" };
}

function pickNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const x of v) {
    if (typeof x === "number" && Number.isFinite(x)) out.push(x);
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
