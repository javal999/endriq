import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeWeeklyReportPayload } from "@/lib/report/computeWeeklyReportPayload";
import { isAthleteUuid } from "@/lib/enduranceiq/isAthleteUuid";
import { buildDemoWeeklyReport } from "@/lib/report/demoModel";
import {
  shareSnapshotFromAnalysisRow,
  shareSnapshotFromModel,
  type ShareCardSnapshot,
} from "@/lib/report/shareCard";

export const runtime = "nodejs";

/** Host shown on share PNG footer (no protocol). */
function shareCardSiteHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "enduranceiq.levitations.id";
  try {
    const u = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
    return u.host || "enduranceiq.levitations.id";
  } catch {
    return "enduranceiq.levitations.id";
  }
}

type Props = { params: Promise<{ athleteId: string; weekStart: string }> };

/** 1080×1080 share card — aggregates only, no raw HR (arch Part 6). */
export async function GET(_req: Request, segmentData: Props) {
  const { athleteId, weekStart } = await segmentData.params;
  const siteHost = shareCardSiteHost();

  if (athleteId === "demo") {
    const model = buildDemoWeeklyReport(weekStart);
    return cardImageResponse(shareSnapshotFromModel(model), siteHost);
  }

  if (!isAthleteUuid(athleteId)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("weekly_analyses")
      .select(
        "week_start, total_distance_meters, total_duration_seconds, total_sessions, pct_zone1_2, pct_zone3, pct_zone4_5, load_ratio, findings",
      )
      .eq("athlete_id", athleteId)
      .eq("week_start", weekStart)
      .maybeSingle();

    let snap: ShareCardSnapshot;
    if (data) {
      snap = shareSnapshotFromAnalysisRow(data);
    } else {
      const payload = await computeWeeklyReportPayload(athleteId, weekStart);
      snap = payload.shareCard;
    }

    return cardImageResponse(snap, siteHost);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "share_card_failed";
    return new Response(msg, { status: 500 });
  }
}

function cardImageResponse(snap: ShareCardSnapshot, siteHost: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          backgroundColor: "#f2f3f6",
          color: "#10131a",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>
            Endurance<span style={{ color: "#2e5e4e" }}>IQ</span>
          </div>
          <div style={{ fontSize: 18, color: "#565d6e", maxWidth: 420, textAlign: "right" }}>
            {snap.weekRangeLabel}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginTop: 24 }}>
          <Metric label="Distance" value={snap.distanceKmLabel} />
          <Metric label="Sessions" value={String(snap.sessions)} />
          <Metric label="Time" value={snap.totalTimeLabel} />
          <Metric label="Load" value={snap.loadWord} accent="#2e7d5b" />
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 14, alignItems: "flex-end" }}>
          <Bar label="Easy" pct={snap.pctEasy} color="#2e5e4e" />
          <Bar label="Mod" pct={snap.pctMod} color="#b87a0a" />
          <Bar label="Hard" pct={snap.pctHard} color="#c44b3f" />
        </div>

        <div style={{ fontSize: 24, fontWeight: 600, maxWidth: 920, lineHeight: 1.3 }}>
          {snap.headline}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end" }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#2e5e4e" }}>{siteHost}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 17, color: "#8a91a0" }}>{label}</span>
      <span style={{ fontSize: 38, fontWeight: 700, color: accent ?? "#10131a" }}>{value}</span>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const fill = Math.min(100, Math.max(pct, 4));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 64,
          height: 200,
          borderRadius: 8,
          backgroundColor: "#eceef2",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: `${fill}%`,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            backgroundColor: color,
          }}
        />
      </div>
      <span style={{ fontSize: 15, color: "#565d6e", fontWeight: 500 }}>
        {label} · {pct}%
      </span>
    </div>
  );
}
