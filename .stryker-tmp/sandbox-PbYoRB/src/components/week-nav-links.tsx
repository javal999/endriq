// @ts-nocheck
import Link from "next/link";
import { addDaysIsoMonday } from "@/lib/report/date";

export function WeekNavLinks({
  athleteId,
  weekStart,
}: {
  athleteId: string;
  weekStart: string;
}) {
  const prev = addDaysIsoMonday(weekStart, -7);
  const next = addDaysIsoMonday(weekStart, 7);
  const base = `/report/${athleteId}`;
  return (
    <nav
      aria-label="Adjacent weeks"
      className="flex gap-4 font-sans text-[13px] font-medium text-[var(--accent)]"
    >
      <Link href={`${base}/${prev}`} prefetch={false} className="hover:underline">
        ← Previous week
      </Link>
      <Link href={`${base}/${next}`} prefetch={false} className="hover:underline">
        Next week →
      </Link>
    </nav>
  );
}
