// @ts-nocheck
"use client";

import Link from "next/link";
import { useState } from "react";

export function CorosActions({
  athleteId,
  connected,
  lastSync,
}: {
  athleteId: string;
  connected: boolean;
  lastSync: string | null;
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  async function syncNow() {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/coros/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: athleteId }),
      });
      const json = (await res.json()) as { ok: boolean; inserted?: number; error?: string };
      setSyncStatus(
        json.ok
          ? `Synced — ${json.inserted ?? 0} new activit${(json.inserted ?? 0) === 1 ? "y" : "ies"}.`
          : (json.error ?? "Sync failed."),
      );
    } catch {
      setSyncStatus("Sync failed — check your connection.");
    } finally {
      setSyncing(false);
    }
  }

  if (!connected) {
    return (
      <Link
        href={`/api/coros/connect?athlete_id=${encodeURIComponent(athleteId)}`}
        className="inline-flex min-h-9 items-center justify-center rounded bg-[var(--accent)] px-4 font-sans text-[13px] font-medium text-white hover:bg-[#245045]"
      >
        Connect COROS
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-sans text-[13px] text-[var(--status-good)]">
        ● Connected
      </span>
      {lastSync && (
        <span className="font-sans text-[12px] text-[var(--text-muted)]">
          Last sync: {new Date(lastSync).toLocaleDateString()}
        </span>
      )}
      <button
        onClick={() => void syncNow()}
        disabled={syncing}
        className="inline-flex min-h-9 items-center justify-center rounded border border-[var(--border)] px-4 font-sans text-[13px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      {syncStatus && (
        <p className="w-full font-sans text-[13px] text-[var(--text-secondary)]">
          {syncStatus}
        </p>
      )}
    </div>
  );
}
