"use client";

import { useCallback, useRef, useState } from "react";

export function ShareWeeklyButton({
  athleteId,
  weekStart,
}: {
  athleteId: string;
  weekStart: string;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const pngPath = `/api/share/weekly/${encodeURIComponent(athleteId)}/${encodeURIComponent(weekStart)}`;
  const [copied, setCopied] = useState(false);

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
        Share this week
      </button>

      <dialog
        ref={dlg}
        className="max-h-[90vh] w-[min(100%,420px)] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg backdrop:bg-black/40"
        onClose={() => setCopied(false)}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-sans text-[14px] font-semibold text-[var(--text-primary)]">
            Share card preview
          </p>
          <button
            type="button"
            onClick={close}
            className="rounded px-2 py-1 font-sans text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
          >
            Close
          </button>
        </div>

        <div className="mt-3 max-h-[min(70vh,520px)] overflow-auto rounded border border-[var(--border)] bg-[var(--surface-raised)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview of dynamic OG PNG */}
          <img
            src={pngPath}
            alt="Weekly training summary card"
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
            {copied ? "Copied URL" : "Copy image URL"}
          </button>
          <a
            href={pngPath}
            download={`enduranceiq-week-${weekStart}.png`}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded bg-[var(--accent)] px-3 font-sans text-[13px] font-medium text-white hover:bg-[#245045]"
          >
            Download PNG
          </a>
        </div>
      </dialog>
    </>
  );
}
