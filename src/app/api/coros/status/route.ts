import { NextResponse } from "next/server";

/** COROS direct API is deferred (vendor instability). Prefer COROS → Strava sync, then Strava OAuth here. */
export async function GET() {
  return NextResponse.json({
    available: false,
    provider: "coros",
    message:
      "Direct COROS OAuth/API is not enabled yet. Sync COROS to Strava on your phone, then connect Strava in EnduranceIQ Settings.",
  });
}
