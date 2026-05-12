/** Subset of Strava SummaryActivity used for sync. */
export interface StravaSummaryActivity {
  id: number;
  name?: string;
  distance?: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
  average_heartrate?: number;
  max_heartrate?: number;
}

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: { id: number };
}
