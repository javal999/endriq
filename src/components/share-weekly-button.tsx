"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type ShareVariant = "full" | "coach_safe";

const VARIANT_COOKIE = "eiq_share_variant";

function readVariantCookie(): ShareVariant {
  if (typeof document === "undefined") return "full";
  const raw = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${VARIANT_COOKIE}=`));
  return raw?.split("=")[1] === "coach_safe" ? "coach_safe" : "full";
}

function writeVariantCookie(v: ShareVariant) {
  if (typeof document === "undefined") return;
  // 1 year, root path, lax samesite, secure when https.
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${VARIANT_COOKIE}=${v}; Max-Age=${365 * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
}

export function ShareWeeklyButton({
  athleteId,
  weekStart,
  shareId,
}: {
  athleteId: string;
  weekStart: string;
  shareId?: string;
}) {
  const t = useTranslations("report");
  const dlg = useRef<HTMLDialogElement>(null);
  const [variant, setVariant] = useState<ShareVariant>("full");
  useEffect(() => {
    // Cookie isn't available during SSR; seeding state on mount is the
    // documented React 18/19 pattern for client-only persisted UI state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVariant(readVariantCookie());
  }, []);
  // T14 — append ?variant for non-default so OG previewers + the modal img
  // both pick up the user's choice. Cookie carries the same value so the
  // OG meta-rendered card stays consistent on share-out.
  const pngPath = (shareId
    ? `/api/share/${encodeURIComponent(shareId)}`
    : `/api/share/weekly/${encodeURIComponent(athleteId)}/${encodeURIComponent(weekStart)}`) +
    (variant === "coach_safe" ? "?variant=coach_safe" : "");
  const [copied, setCopied] = useState(false);

  const setAndPersistVariant = useCallback((v: ShareVariant) => {
    setVariant(v);
    writeVariantCookie(v);
  }, []);

  const open = useCallback(() => {
    dlg.current?.showModal();
    setCopied(false);
  }, []);

  const close = useCallback(() => {
    dlg.current?.close();
    setCopied(false);
  }, []);

  const copyUrl = useCallback(async () => {
    const url = `${window.location.origin}${pngPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [pngPath]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded border border-[var(--border)] px-5 font-sans text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:bg-[rgba(46,94,78,0.09)] hover:text-[var(--accent)]"
      >
        {t("share.button")}
      </button>

      <dialog
        ref={dlg}
        className="max-h-[90vh] w-[min(100%,420px)] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg backdrop:bg-black/40"
        onClose={() => setCopied(false)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-[14px] font-semibold text-[var(--text-primary)]">
              {t("share.modal.title")}
            </p>
            <p className="mt-0.5 font-sans text-[12px] text-[var(--text-muted)]">
              {t("share.modal.desc")}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded px-2 py-1 font-sans text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
          >
            ×
          </button>
        </div>

        {/* T14 — variant toggle. Cookie persists choice across renders. */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAndPersistVariant("full")}
            aria-pressed={variant === "full"}
            className={
              "rounded border px-3 py-2 font-sans text-[12px] transition-colors " +
              (variant === "full"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]"
                : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)]")
            }
          >
            Full
            <span className="mt-0.5 block text-[10px] font-normal text-[var(--text-muted)]">
              Includes the week&apos;s top finding
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAndPersistVariant("coach_safe")}
            aria-pressed={variant === "coach_safe"}
            className={
              "rounded border px-3 py-2 font-sans text-[12px] transition-colors " +
              (variant === "coach_safe"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]"
                : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)]")
            }
          >
            Coach-safe
            <span className="mt-0.5 block text-[10px] font-normal text-[var(--text-muted)]">
              Aggregates only, no finding text
            </span>
          </button>
        </div>

        <div className="mt-3 max-h-[min(70vh,520px)] overflow-auto rounded border border-[var(--border)] bg-[var(--surface-raised)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview of dynamic OG PNG */}
          <img
            key={variant}
            src={pngPath}
            alt={`Weekly training summary card — ${variant === "coach_safe" ? "coach-safe variant" : "full variant"}`}
            className="mx-auto max-h-[480px] w-auto max-w-full object-contain"
            width={1080}
            height={1080}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded border border-[var(--border)] px-3 font-sans text-[13px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:bg-[rgba(46,94,78,0.09)]"
          >
            {copied ? "✓" : t("share.modal.copy")}
          </button>
          <a
            href={pngPath}
            download={`enduranceiq-week-${weekStart}.png`}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded bg-[var(--accent)] px-3 font-sans text-[13px] font-medium text-white hover:bg-[#245045]"
          >
            {t("share.modal.download")}
          </a>
        </div>
      </dialog>
    </>
  );
}
