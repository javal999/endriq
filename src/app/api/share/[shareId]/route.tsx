import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { shareSnapshotFromAnalysisRow, type ShareCardSnapshot } from "@/lib/report/shareCard";
import { checkLimit, shareCardLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Variant of the share card.
 *   - full       : the existing card. Headline derived from findings — may
 *                   surface "too much hard" / "load spike" / etc. Fine for
 *                   the athlete's own social posts.
 *   - coach_safe : positive aggregate headline only. No finding text.
 *                   Distance + intensity bars still shown.
 */
type ShareVariant = "full" | "coach_safe";

function parseVariant(s: string | null): ShareVariant {
  return s === "coach_safe" ? "coach_safe" : "full";
}

function coachSafeHeadline(snap: ShareCardSnapshot): string {
  // Hard-coded copy: positive aggregate, no finding text. Mirrors the
  // share-snapshot inputs we have without inventing a phase / plan claim.
  return `${snap.distanceKmLabel} · ${snap.sessions} sessions · ${snap.pctEasy}% easy. Keeping the pattern.`;
}

function siteHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "enduranceiq.levitations.id";
  try {
    const u = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
    return u.host || "enduranceiq.levitations.id";
  } catch { return "enduranceiq.levitations.id"; }
}

function cardResponse(snap: ShareCardSnapshot, host: string) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56, backgroundColor: "#f2f3f6", color: "#10131a", fontFamily: "Inter, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>Endurance<span style={{ color: "#2e5e4e" }}>IQ</span></div>
          <div style={{ fontSize: 18, color: "#565d6e", maxWidth: 420, textAlign: "right" }}>{snap.weekRangeLabel}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginTop: 24 }}>
          {[{ label: "Distance", value: snap.distanceKmLabel }, { label: "Sessions", value: String(snap.sessions) }, { label: "Time", value: snap.totalTimeLabel }, { label: "Load", value: snap.loadWord, accent: "#2e7d5b" }].map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 17, color: "#8a91a0" }}>{m.label}</span>
              <span style={{ fontSize: 38, fontWeight: 700, color: m.accent ?? "#10131a" }}>{m.value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, display: "flex", gap: 14, alignItems: "flex-end" }}>
          {[{ label: "Easy", pct: snap.pctEasy, color: "#2e5e4e" }, { label: "Mod", pct: snap.pctMod, color: "#b87a0a" }, { label: "Hard", pct: snap.pctHard, color: "#c44b3f" }].map((b) => (
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

type Props = { params: Promise<{ shareId: string }> };

export async function GET(_req: Request, segmentData: Props) {
  const { shareId } = await segmentData.params;
  const host = siteHost();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareId)) return new Response("Not found", { status: 404 });
  const ip = (_req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const { allowed } = await checkLimit(shareCardLimit, `share:${ip}`);
  if (!allowed) return new Response("Too many requests", { status: 429 });
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("weekly_analyses").select("week_start, total_distance_meters, total_duration_seconds, total_sessions, pct_zone1_2, pct_zone3, pct_zone4_5, load_ratio, findings").eq("share_id", shareId).maybeSingle();
    if (!data) return new Response("Not found", { status: 404 });

    // T14 — variant selection. ?variant=coach_safe wins over the cookie;
    // otherwise default to "full". The cookie is set by the share modal
    // so OG meta tags render the variant the athlete last picked.
    const url = new URL(_req.url);
    const queryVariant = parseVariant(url.searchParams.get("variant"));
    const cookieVariant = parseVariant(
      _req.headers
        .get("cookie")
        ?.split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("eiq_share_variant="))
        ?.split("=")[1] ?? null,
    );
    const variant: ShareVariant = url.searchParams.has("variant")
      ? queryVariant
      : cookieVariant;

    const snap = shareSnapshotFromAnalysisRow(data);
    if (variant === "coach_safe") {
      snap.headline = coachSafeHeadline(snap);
    }
    return cardResponse(snap, host);
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "share_card_failed", { status: 500 });
  }
}
