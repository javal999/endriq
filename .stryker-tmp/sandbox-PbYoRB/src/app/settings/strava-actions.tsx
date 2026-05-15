// @ts-nocheck
"use client";

import { useState } from "react";

export function StravaActions({ athleteId }: { athleteId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/strava/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: athleteId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        inserted?: number;
        fetchedPages?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "Sync failed");
      } else {
        setMsg(
          `Synced ${data.inserted ?? 0} new activities (${data.fetchedPages ?? 0} Strava pages fetched).`,
        );
      }
    } catch {
      setMsg("Network error during sync.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <a
          className="inline-flex min-h-11 items-center justify-center rounded bg-[var(--accent)] px-5 font-sans text-[13px] font-medium text-white transition-colors hover:bg-[#245045]"
          href={`/api/strava/connect?athlete_id=${encodeURIComponent(athleteId)}`}
        >
          Connect Strava
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={() => void sync()}
          className="inline-flex min-h-11 items-center justify-center rounded border border-[var(--border)] px-5 font-sans text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:bg-[rgba(46,94,78,0.09)] hover:text-[var(--accent)] disabled:opacity-50"
        >
          {busy ? "Syncing…" : "Sync last 90 days"}
        </button>
      </div>
      {msg ? (
        <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{msg}</p>
      ) : null}
      <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
        Scope uses <span className="font-mono">read</span> and{" "}
        <span className="font-mono">activity:read_all</span> by default so runs with HR
        import correctly. COROS users: sync COROS → Strava first (watch/app), then use
        Connect Strava here.
      </p>
    </div>
  );
}
