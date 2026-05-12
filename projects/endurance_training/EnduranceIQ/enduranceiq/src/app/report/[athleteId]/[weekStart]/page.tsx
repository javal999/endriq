import Link from "next/link";
import { redirect } from "next/navigation";
import { isAthleteUuid } from "@/lib/enduranceiq/isAthleteUuid";
import { buildWeeklyReport } from "@/lib/report/buildWeeklyReport";
import { buildDemoWeeklyReport } from "@/lib/report/demoModel";
import { createClient } from "@/lib/supabase/server";
import { WeeklyReportView } from "./weekly-report-view";

type Props = { params: Promise<{ athleteId: string; weekStart: string }> };

export default async function WeeklyReportPage({ params }: Props) {
  const { athleteId, weekStart } = await params;
  const isDemo = athleteId === "demo";

  if (isDemo) {
    const model = buildDemoWeeklyReport(weekStart);
    return (
      <WeeklyReportView model={model} athleteId="demo" weekStart={weekStart} />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAthleteUuid(athleteId)) {
    return (
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 md:px-12 md:pt-12">
        <p className="rounded border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          Unknown athlete id. Use the seeded athlete UUID from{" "}
          <Link href="/settings" className="text-[var(--accent)] underline">
            Settings
          </Link>{" "}
          or open the{" "}
          <Link href="/report/demo/2026-05-04" className="text-[var(--accent)] underline">
            demo report
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!user) {
    redirect(
      `/auth/login?redirect=${encodeURIComponent(`/report/${athleteId}/${weekStart}`)}`,
    );
  }
  if (user.id !== athleteId) {
    return (
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 md:px-12 md:pt-12">
        <p className="rounded border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          You do not have access to this athlete&apos;s report.
        </p>
      </div>
    );
  }

  let report: Awaited<ReturnType<typeof buildWeeklyReport>> | undefined;
  let loadError:
    | { message: string; missingEnv: boolean }
    | undefined;

  try {
    report = await buildWeeklyReport(athleteId, weekStart, supabase);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load report.";
    const missingEnv =
      message.includes("NEXT_PUBLIC_SUPABASE_URL") ||
      message.includes("SUPABASE_SERVICE_ROLE_KEY");
    loadError = { message, missingEnv };
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 md:px-12 md:pt-12">
        <p className="rounded border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          {loadError.missingEnv
            ? "Supabase admin env is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server."
            : loadError.message}
        </p>
        {!loadError.missingEnv ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            <Link href="/settings" className="text-[var(--accent)] underline">
              Settings
            </Link>{" "}
            ·{" "}
            <Link href="/report/demo/2026-05-04" className="text-[var(--accent)] underline">
              Demo report
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <WeeklyReportView model={report!} athleteId={athleteId} weekStart={weekStart} />
  );
}
