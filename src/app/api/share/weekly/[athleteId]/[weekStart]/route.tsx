import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
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

function siteHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "enduranceiq.levitations.id";
  try {
    const u = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
    return u.host || "enduranceiq.levitations.id";
  } catch {
    return "enduranceiq.levitations.id";
  }
}

function cardResponse(snap: ShareCardSnapshot, host: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: 56,
          backgroundColor: "#f2f3f6", color: "#10131a", fontFamily: "Inter, sans-serif",
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
          {[
            { label: "Distance", value: snap.distanceKmLabel },
            { label: "Sessions", value: String(snap.sessions) },
            { label: "Time", value: snap.totalTimeLabel },
            { label: "Load", value: snap.loadWord, accent: "#2e7d5b" },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 17, color: "#8a91a0" }}>{m.label}</span>
              <span style={{ fontSize: 38, fontWeight: 700, color: m.accent ?? "#10131a" }}>{m.value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, display: "flex", gap: 14, alignItems: "flex-end" }}>
          {[
            { label: "Easy", pct: snap.pctEasy, color: "#2e5e4e" },
            { label: "Mod", pct: snap.pctMod, color: "#b87a0a" },
            { label: "Hard", pct: snap.pctHard, color: "#c44b3f" },
          ].map((b) => (
            <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ width: 64, height: 200, borderRadius: 8, backgroundColor: "#eceef2", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
                <div style={{ width: "100%", height: `${Math.min(100, Math.max(b.pct, 4))}%`, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: b.color }} />
              </div>
              <span style={{ fontSize: 15, color: "#565d6e", fontWeight: 500 }}>{b.label} · {b.pct}%</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 24, fontWeight: 600, maxWidth: 920, lineHeight: 1.3 }}>{snap.headline}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end" }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#2e5e4e" }}>{host}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}

type Props = { params: Promise<{ athleteId: string; weekStart: string }> };

export async function GET(_req: Request, segmentData: Props) {
  const { athleteId, weekStart } = await segmentData.params;
  const host = siteHost();
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  if (athleteId === "demo") {
    try {
      const model = buildDemoWeeklyReport(weekStart);
      const snap = shareSnapshotFromModel(model);
      return cardResponse(snap, host);
    } catch (e) {
      const msg = e instanceof Error ? `demo_error: ${e.message}\n${e.stack?.slice(0, 500)}` : "demo_error";
      console.error("[share/demo]", e);
      return new Response(msg, { status: 500, headers: { "content-type": "text/plain" } });
    }
  }

  if (!isAthleteUuid(athleteId)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("weekly_analyses")
      .select("share_id, week_start, total_distance_meters, total_duration_seconds, total_sessions, pct_zone1_2, pct_zone3, pct_zone4_5, load_ratio, findings")
      .eq("athlete_id", athleteId)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (data?.share_id) {
      return NextResponse.redirect(`${base}/api/share/${data.share_id}`, { status: 302 });
    }
    if (data) {
      return cardResponse(shareSnapshotFromAnalysisRow(data), host);
    }
    const payload = await computeWeeklyReportPayload(athleteId, weekStart);
    return cardResponse(payload.shareCard, host);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "share_card_failed";
    return new Response(msg, { status: 500 });
  }
}
