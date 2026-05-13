/**
 * COROS Open Platform API types.
 * Verify these against https://opens.coros.com documentation at build time —
 * the response shape has historically changed between API versions.
 */

/** Token response from COROS OAuth token endpoint. */
export interface CorosTokenResponse {
  access_token: string;
  refresh_token: string;
  /** Relative expiry in seconds from now (COROS uses expires_in, not expires_at). */
  expires_in: number;
  token_type: string;
  /** COROS user ID (present in token response). */
  openId?: string;
}

/** Summary activity from COROS activity list endpoint. */
export interface CorоsSummaryActivity {
  /** Unique activity identifier. */
  sportDataId?: string;
  labelId?: string;
  /** Activity type code — verify against current COROS API docs. */
  mode?: number;
  /** ISO datetime or Unix timestamp. */
  startTime?: string | number;
  /** Duration in seconds. */
  totalTime?: number;
  /** Distance in meters. */
  totalDistance?: number;
  /** Average heart rate (bpm). */
  avgHeartRate?: number;
  /** Max heart rate (bpm). */
  maxHeartRate?: number;
  /** Average cadence (steps per minute for running). */
  avgCadence?: number;
  /** Total elevation gain (meters). */
  totalAscent?: number;
  /** Calories (kcal). */
  calorie?: number;
}

/** Wrapper used by COROS list endpoint. */
export interface CorosActivityListResponse {
  result?: string;
  message?: string;
  data?: {
    sportDataList?: CorоsSummaryActivity[];
    count?: number;
  };
}
