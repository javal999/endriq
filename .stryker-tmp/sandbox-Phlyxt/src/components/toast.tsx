// @ts-nocheck
"use client";

import { useEffect, useState } from "react";

/**
 * Minimal toast notification — top-right, auto-dismisses after 3s.
 * Accessible: role="status", aria-live="polite".
 */
export function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-sans text-[13px] font-medium shadow-lg text-[var(--text-primary)] animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <span className="size-2 rounded-full bg-[var(--status-good)]" aria-hidden />
      {message}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        ×
      </button>
    </div>
  );
}

/** Hook that manages toast visibility. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  function show(msg: string) {
    setMessage(msg);
  }

  function dismiss() {
    setMessage(null);
  }

  return { message, show, dismiss };
}
