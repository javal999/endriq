import { createAdminClient } from "@/lib/supabase/admin";
import { CoachReadOnlyReport, type CoachWeekRow } from "./coach-read-only-report";
import { flags } from "@/lib/featureFlags";
import { notFound } from "next/navigation";

/**
 * /coach/[uuid] — F13 PUBLIC read-only coach view.
 *
 * No authentication. Anyone with the link URL sees the athlete's
 * first name + 9 weeks of report aggregates. The SECURITY DEFINER
 * get_coach_view() function in migration 024 is the privacy boundary:
 *   - email NEVER returned
 *   - last name NEVER returned (first-name only)
 *   - raw per-session HR NEVER returned (only aggregates)
 *
 * Smoke tests in src/lib/coach-links.smoke.test.ts pin this contract.
 *
 * Gating: feature flag FF_COACH_VIEW. When off, returns 404.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.6 F13; PHASE-2.0-BUILD.md T13;
 *       PHASE-2.0-ARCHITECTURE.md §5.5 (A3 smoke tests).
 */

export const metadata = { title: "Coach view — EnduranceIQ" };

type Props = { params: Promise<{ uuid: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CoachViewPage({ params }: Props) {
  const { uuid } = await params;

  if (!flags.COACH_VIEW_PUBLIC) notFound();
  if (!UUID_RE.test(uuid)) notFound();

  const admin = createAdminClient();

  // Status check first so we can render the right copy when the link is
  // dead. The view function returns an empty set in those cases too, but
  // separating them lets us distinguish "expired" from "no data yet".
  const statusRes = await admin.rpc("get_coach_link_status", { link_uuid: uuid });
  const status = (statusRes.data as string | null) ?? "not_found";

  if (status === "not_found") notFound();

  if (status === "expired" || status === "revoked") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:px-8">
        <h1 className="font-sans text-[20px] font-medium text-[var(--text-primary)] [font-family:var(--font-display),Inter,sans-serif]">
          {status === "expired"
            ? "This coach link has expired."
            : "This link has been revoked."}
        </h1>
        <p className="mt-3 font-sans text-[14px] text-[var(--text-secondary)]">
          Ask the athlete for a new one.
        </p>
      </div>
    );
  }

  const { data: rows } = await admin.rpc("get_coach_view", { link_uuid: uuid });
  const weekRows = (rows ?? []) as CoachWeekRow[];

  if (weekRows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:px-8">
        <h1 className="font-sans text-[20px] font-medium">No data yet.</h1>
        <p className="mt-3 font-sans text-[14px] text-[var(--text-secondary)]">
          The athlete hasn&apos;t generated a weekly report yet.
        </p>
      </div>
    );
  }

  const firstName = weekRows[0].athlete_first_name;

  return <CoachReadOnlyReport firstName={firstName} weeks={weekRows} />;
}
