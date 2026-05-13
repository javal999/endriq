import { createAdminClient } from "@/lib/supabase/admin";
import { shareSnapshotFromAnalysisRow } from "@/lib/report/shareCard";
import { cardImageResponse, shareCardSiteHost } from "@/lib/report/shareCardRenderer";
import { checkLimit, shareCardLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

type Props = { params: Promise<{ shareId: string }> };

/**
 * 1080×1080 share card looked up by weekly_analyses.share_id (UUID).
 * More privacy-friendly than /api/share/weekly/[athleteId]/[weekStart] —
 * the URL doesn't expose the athlete ID.
 */
export async function GET(_req: Request, segmentData: Props) {
  const { shareId } = await segmentData.params;
  const siteHost = shareCardSiteHost();

  // Basic UUID validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareId)) {
    return new Response("Not found", { status: 404 });
  }

  // Rate limit by IP (share cards are public — no auth required)
  const ip =
    (_req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    "unknown";
  const { allowed } = await checkLimit(shareCardLimit, `share:${ip}`);
  if (!allowed) {
    return new Response("Too many requests", { status: 429 });
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("weekly_analyses")
      .select(
        "week_start, total_distance_meters, total_duration_seconds, total_sessions, pct_zone1_2, pct_zone3, pct_zone4_5, load_ratio, findings",
      )
      .eq("share_id", shareId)
      .maybeSingle();

    if (!data) {
      return new Response("Not found", { status: 404 });
    }

    const snap = shareSnapshotFromAnalysisRow(data);
    return cardImageResponse(snap, siteHost);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "share_card_failed";
    return new Response(msg, { status: 500 });
  }
}
