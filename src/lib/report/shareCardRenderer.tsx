/**
 * Share card image renderer — uses React.createElement instead of JSX
 * to avoid compilation issues when imported from route handlers in Next.js 16.
 */
import { createElement as h } from "react";
import { ImageResponse } from "next/og";
import type { ShareCardSnapshot } from "./shareCard";

export function shareCardSiteHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "enduranceiq.levitations.id";
  try {
    const u = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
    return u.host || "enduranceiq.levitations.id";
  } catch {
    return "enduranceiq.levitations.id";
  }
}

function metric(label: string, value: string, accent?: string) {
  return h("div", { style: { display: "flex", flexDirection: "column" } },
    h("span", { style: { fontSize: 17, color: "#8a91a0" } }, label),
    h("span", { style: { fontSize: 38, fontWeight: 700, color: accent ?? "#10131a" } }, value),
  );
}

function bar(label: string, pct: number, color: string) {
  const fill = Math.min(100, Math.max(pct, 4));
  return h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 } },
    h("div", {
      style: {
        width: 64, height: 200, borderRadius: 8, backgroundColor: "#eceef2",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden",
      },
    },
      h("div", {
        style: {
          width: "100%", height: `${fill}%`,
          borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: color,
        },
      }),
    ),
    h("span", { style: { fontSize: 15, color: "#565d6e", fontWeight: 500 } },
      `${label} · ${pct}%`,
    ),
  );
}

export function cardImageResponse(snap: ShareCardSnapshot, siteHost: string) {
  return new ImageResponse(
    h("div", {
      style: {
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: 56,
        backgroundColor: "#f2f3f6", color: "#10131a", fontFamily: "Inter, sans-serif",
      },
    },
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
        h("div", { style: { fontSize: 28, fontWeight: 700, letterSpacing: -1 } },
          "Endurance",
          h("span", { style: { color: "#2e5e4e" } }, "IQ"),
        ),
        h("div", { style: { fontSize: 18, color: "#565d6e", maxWidth: 420, textAlign: "right" } },
          snap.weekRangeLabel,
        ),
      ),
      h("div", { style: { display: "flex", flexWrap: "wrap", gap: 32, marginTop: 24 } },
        metric("Distance", snap.distanceKmLabel),
        metric("Sessions", String(snap.sessions)),
        metric("Time", snap.totalTimeLabel),
        metric("Load", snap.loadWord, "#2e7d5b"),
      ),
      h("div", { style: { marginTop: 28, display: "flex", gap: 14, alignItems: "flex-end" } },
        bar("Easy", snap.pctEasy, "#2e5e4e"),
        bar("Mod", snap.pctMod, "#b87a0a"),
        bar("Hard", snap.pctHard, "#c44b3f"),
      ),
      h("div", { style: { fontSize: 24, fontWeight: 600, maxWidth: 920, lineHeight: 1.3 } },
        snap.headline,
      ),
      h("div", { style: { display: "flex", justifyContent: "flex-end", alignItems: "flex-end" } },
        h("div", { style: { fontSize: 22, fontWeight: 600, color: "#2e5e4e" } }, siteHost),
      ),
    ),
    { width: 1080, height: 1080 },
  );
}
