import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeWeeklyReportPayload } from "@/lib/report/computeWeeklyReportPayload";
import { isAthleteUuid } from "@/lib/enduranceiq/isAthleteUuid";
import { buildDemoWeeklyReport } from "@/lib/report/demoModel";
import { shareSnapshotFromAnalysisRow, shareSnapshotFromModel } from "@/lib/report/shareCard";
import { cardImageResponse, shareCardSiteHost } from "@/lib/report/shareCardRenderer";

export const runtime = "nodejs";

type Props = { params: Promise<{ athleteId: string; weekStart: string }> };

/**
 * Legacy share card endpoint — redirects to /api/share/[shareId] when possible.
 * Kept for backwards compatibility (share cards already in the wild).
 */
export async function GET(_req: Request, segmentData: Props) {
  const { athleteId, weekStart } = await segmentData.params;
  const siteHost = shareCardSiteHost();
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  // Demo path: render directly, no redirect needed
  if (athleteId === "demo") {
    try {
      const model = buildDemoWeeklyReport(weekStart);
      return cardImageResponse(shareSnapshotFromModel(model), siteHost);
    } catch (e) {
      const msg = e instanceof Error ? `demo_share_failed: ${e.message}` : "demo_share_failed";
      console.error("[share/demo]", e);
      return new Response(msg, { status: 500 });
    }
  }

  if (!isAthleteUuid(athleteId)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("weekly_analyses")
      .select(
        "share_id, week_start, total_distance_meters, total_duration_seconds, total_sessions, pct_zone1_2, pct_zone3, pct_zone4_5, load_ratio, findings",
      )
      .eq("athlete_id", athleteId)
      .eq("week_start", weekStart)
      .maybeSingle();

    // Redirect to the share_id URL if available
    if (data?.share_id) {
      return NextResponse.redirect(
        `${base}/api/share/${data.share_id}`,
        { status: 302 },
      );
    }

    // Fallback: render the card directly if no row yet
    if (data) {
      return cardImageResponse(shareSnapshotFromAnalysisRow(data), siteHost);
    }
    const payload = await computeWeeklyReportPayload(athleteId, weekStart);
    return cardImageResponse(payload.shareCard, siteHost);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "share_card_failed";
    return new Response(msg, { status: 500 });
  }
}
