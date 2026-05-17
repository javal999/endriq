"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type FieldKey = "hr_rest" | "sex" | "goal_race_date" | "goal_weekly_km" | "observed_max_hr";

const FIELD_HREF: Record<FieldKey, string> = {
  hr_rest: "/settings#profile",
  sex: "/settings#profile",
  goal_race_date: "/settings#profile",
  goal_weekly_km: "/settings#profile",
  observed_max_hr: "/settings#profile",
};

const DISMISS_KEY_PREFIX = "eiq_banner_dismissed_";

/**
 * Surfaces one missing-profile-field nudge at a time.
 * Dismissal is per-field and stored in localStorage.
 */
export function ProfileCompletenessBanner({
  missingFields,
}: {
  missingFields: string[];
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = new Set<string>();
    for (const field of missingFields) {
      if (localStorage.getItem(`${DISMISS_KEY_PREFIX}${field}`) === "1") {
        saved.add(field);
      }
    }
    // localStorage is unavailable during SSR; reading on mount and seeding state is
    // the documented React 18/19 pattern for client-only persisted UI state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [missingFields]);

  if (!ready) return null;

  const activeField = missingFields.find((f) => !dismissed.has(f)) as FieldKey | undefined;
  if (!activeField) return null;

  const copy = t(`banner.${activeField}` as `banner.hr_rest`);
  const href = FIELD_HREF[activeField] ?? "/settings#profile";

  function dismiss() {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${activeField}`, "1");
    setDismissed((prev) => new Set([...prev, activeField!]));
  }

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-4 rounded border border-[var(--border)] bg-[rgba(46,94,78,0.06)] px-4 py-3 font-sans text-[13px]"
    >
      <p className="text-[var(--text-secondary)]">
        {copy}{" "}
        <Link
          href={href}
          className="font-medium text-[var(--accent)] underline underline-offset-2"
        >
          {t("banner.fixThis")}
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label={tc("actions.dismiss")}
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        ×
      </button>
    </div>
  );
}
