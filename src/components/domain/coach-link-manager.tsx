"use client";

/**
 * <CoachLinkManager> — F13 generation / revocation UI for Settings.
 *
 * Shows the athlete's active coach link (if any) with copy + revoke
 * actions. When no active link exists, surfaces the "Generate" button.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.6 F13; PHASE-2.0-BUILD.md T13 step 4.
 */

import { useEffect, useState } from "react";
import { HairlineCard } from "@/components/ui/hairline-card";

interface CoachLinkRow {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export function CoachLinkManager({ appUrl }: { appUrl: string }) {
  const [links, setLinks] = useState<CoachLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/coach-link");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Couldn't load coach links.");
      }
      const j = (await res.json()) as { links: CoachLinkRow[] };
      setLinks(j.links);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load.");
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/coach-link", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Couldn't generate.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate.");
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    setRevoking(id);
    try {
      const res = await fetch(`/api/coach-link?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Couldn't revoke.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't revoke.");
    } finally {
      setRevoking(null);
    }
  }

  async function copyLink(id: string) {
    const url = `${appUrl}/coach/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Ignore — UI already shows the URL inline.
    }
  }

  const active = links.filter((l) => !l.revoked_at && new Date(l.expires_at) > new Date());

  if (loading) {
    return (
      <p className="font-sans text-[13px] text-[var(--text-muted)]">Loading…</p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="font-sans text-[13px] text-[var(--status-bad)]">{error}</p>
      )}

      {active.length === 0 ? (
        <div className="space-y-2">
          <p className="font-sans text-[13px] text-[var(--text-secondary)]">
            Generate a 90-day, read-only link your coach can open without signing
            up. Shares your first name + weekly aggregates only — never email or
            full name.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="rounded-md bg-[var(--accent)] px-4 py-2 font-sans text-[13px] font-medium text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate coach link"}
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {active.map((link) => {
            const url = `${appUrl}/coach/${link.id}`;
            return (
              <li key={link.id}>
                <HairlineCard emphasised className="space-y-2">
                  <p className="break-all font-mono text-[12px] text-[var(--text-primary)]">
                    {url}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-sans text-[11px] text-[var(--text-muted)]">
                      Expires {link.expires_at.slice(0, 10)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void copyLink(link.id)}
                        className="rounded-sm border border-[var(--border)] bg-transparent px-2.5 py-1 font-sans text-[12px] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                      >
                        {copied === link.id ? "Copied" : "Copy"}
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-sm border border-[var(--border)] bg-transparent px-2.5 py-1 font-sans text-[12px] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                      >
                        Preview ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => void revoke(link.id)}
                        disabled={revoking === link.id}
                        className="rounded-sm border border-[var(--border)] bg-transparent px-2.5 py-1 font-sans text-[12px] text-[var(--status-bad)] hover:border-[var(--status-bad)] disabled:opacity-50"
                      >
                        {revoking === link.id ? "Revoking…" : "Revoke"}
                      </button>
                    </div>
                  </div>
                </HairlineCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
