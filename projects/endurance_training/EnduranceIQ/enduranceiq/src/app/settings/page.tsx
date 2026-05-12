import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettings } from "./profile-settings";
import { StravaActions } from "./strava-actions";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/settings")}`);
  }

  const athleteId = user.id;

  const { data: athleteRow } = await supabase
    .from("athletes")
    .select("observed_max_hr")
    .eq("id", athleteId)
    .single();

  const sp = await searchParams;
  const strava = typeof sp.strava === "string" ? sp.strava : undefined;
  const reason =
    typeof sp.reason === "string" ? decodeURIComponent(sp.reason) : undefined;

  const stravaEnvReady =
    Boolean(process.env.STRAVA_CLIENT_ID) &&
    Boolean(process.env.STRAVA_CLIENT_SECRET);
  const appUrlConfigured = Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim());

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:px-8">
      <h1 className="font-sans text-xl font-bold tracking-tight">Settings</h1>

      {!stravaEnvReady ? (
        <div
          className="mt-6 rounded border border-[var(--border)] bg-[rgba(184,122,10,0.08)] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-secondary)]"
          role="status"
        >
          <strong className="font-semibold text-[var(--text-primary)]">
            Strava is not configured in this environment yet.
          </strong>{" "}
          Add to{" "}
          <code className="rounded bg-[var(--surface)] px-1 font-mono text-[12px]">
            .env.local
          </code>
          :{" "}
          <code className="font-mono text-[12px]">STRAVA_CLIENT_ID</code>,{" "}
          <code className="font-mono text-[12px]">STRAVA_CLIENT_SECRET</code>, and{" "}
          <code className="font-mono text-[12px]">STRAVA_REDIRECT_URI</code> (see{" "}
          <code className="font-mono text-[12px]">.env.example</code>
          ). Register your app at{" "}
          <a
            href="https://www.strava.com/settings/api"
            className="text-[var(--accent)] underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            strava.com/settings/api
          </a>
          . Restart{" "}
          <code className="font-mono text-[12px]">npm run dev</code> after saving.
        </div>
      ) : null}

      {!appUrlConfigured ? (
        <div
          className={`rounded border border-[var(--border)] px-4 py-3 text-[12px] text-[var(--text-muted)] ${stravaEnvReady ? "mt-3" : "mt-6"}`}
        >
          Set{" "}
          <code className="font-mono">NEXT_PUBLIC_APP_URL</code> in{" "}
          <code className="font-mono">.env.local</code> (e.g.{" "}
          <code className="font-mono">http://localhost:3000</code>) so OAuth
          redirects work reliably after Strava approval.
        </div>
      ) : null}

      {strava === "connected" ? (
        <p className="mt-4 rounded border border-[var(--border)] bg-[rgba(46,125,91,0.08)] px-4 py-3 text-[13px] text-[var(--status-good)]">
          Strava connected. Run a sync to pull activities into Supabase.
        </p>
      ) : null}

      {strava === "error" ? (
        <p className="mt-4 rounded border border-[var(--border)] bg-[rgba(196,75,63,0.06)] px-4 py-3 text-[13px] text-[var(--status-bad)]">
          Strava error{reason ? `: ${reason}` : ""}.
        </p>
      ) : null}

      <section className="mt-10" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="font-sans text-[15px] font-semibold">
          Profile
        </h2>
        <ProfileSettings
          athleteId={athleteId}
          initialMaxHr={
            typeof athleteRow?.observed_max_hr === "number"
              ? athleteRow.observed_max_hr
              : null
          }
        />
      </section>

      <section className="mt-10" aria-labelledby="integrations-heading">
        <h2 id="integrations-heading" className="font-sans text-[15px] font-semibold">
          Integrations
        </h2>
        <div className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
            Strava
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            OAuth reads activities you permit (including HR when present on Strava).
          </p>
          <div className="mt-5">
            <StravaActions athleteId={athleteId} />
          </div>
        </div>

        <div className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] p-6 opacity-90">
          <h3 className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
            COROS (direct)
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Not enabled yet.{" "}
            <a
              href="/api/coros/status"
              className="text-[var(--accent)] underline underline-offset-2"
            >
              Status JSON
            </a>
          </p>
        </div>
      </section>

      <p className="mt-10 text-[12px] leading-relaxed text-[var(--text-muted)]">
        This is general fitness information, not medical advice. Consult a healthcare
        professional for medical concerns and a qualified coach for programming.
      </p>
    </div>
  );
}
