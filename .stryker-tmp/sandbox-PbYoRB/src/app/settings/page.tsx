// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettings } from "./profile-settings";
import { StravaActions } from "./strava-actions";
import { CorosActions } from "./coros-actions";
import { ExperimentalStrengthToggle } from "./experimental-strength-toggle";
import { RoastToggle } from "./roast-toggle";

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
    .select("observed_max_hr, hr_rest, sex, goal_race_type, goal_race_date, goal_weekly_km, strength_recommendations_optin, roast_enabled")
    .eq("id", athleteId)
    .single();

  const { data: corosConn } = await supabase
    .from("oauth_connections")
    .select("updated_at")
    .eq("athlete_id", athleteId)
    .eq("provider", "coros")
    .maybeSingle();

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
          initialMaxHr={typeof athleteRow?.observed_max_hr === "number" ? athleteRow.observed_max_hr : null}
          initialHrRest={typeof athleteRow?.hr_rest === "number" ? athleteRow.hr_rest : null}
          initialSex={typeof athleteRow?.sex === "string" ? athleteRow.sex : null}
          initialRaceType={typeof athleteRow?.goal_race_type === "string" ? athleteRow.goal_race_type : null}
          initialRaceDate={athleteRow?.goal_race_date ? String(athleteRow.goal_race_date) : null}
          initialWeeklyKm={typeof athleteRow?.goal_weekly_km === "number" ? athleteRow.goal_weekly_km : null}
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

        <div className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
            COROS
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            One-click OAuth — reads activities directly from your COROS watch.
            Requires{" "}
            <code className="rounded bg-[var(--surface-raised)] px-1 font-mono text-[12px]">
              COROS_CLIENT_ID
            </code>{" "}
            and{" "}
            <code className="rounded bg-[var(--surface-raised)] px-1 font-mono text-[12px]">
              COROS_CLIENT_SECRET
            </code>{" "}
            in your environment. Register at{" "}
            <a
              href="https://opens.coros.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] underline underline-offset-2"
            >
              opens.coros.com
            </a>
            .
          </p>
          <div className="mt-5">
            <CorosActions
              athleteId={athleteId}
              connected={corosConn != null}
              lastSync={corosConn?.updated_at ?? null}
            />
          </div>
        </div>

        <div className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] p-6 opacity-75">
          <h3 className="font-sans text-[14px] font-medium text-[var(--text-primary)]">
            Garmin
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            If you have a Garmin, enable Strava sync in Garmin Connect
            (Settings → Connect → Strava). Your Garmin activities will flow
            through Strava into EnduranceIQ. Direct Garmin integration is
            planned for a future phase.
          </p>
        </div>
      </section>

      <section id="experimental" className="mt-10" aria-labelledby="experimental-heading">
        <h2 id="experimental-heading" className="font-sans text-[15px] font-semibold">
          Experimental features
        </h2>
        <div className="mt-4 rounded border border-[var(--border)] bg-[var(--surface)] p-6">
          <ExperimentalStrengthToggle
            athleteId={athleteId}
            initialOptin={Boolean(athleteRow?.strength_recommendations_optin)}
          />
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <RoastToggle
              athleteId={athleteId}
              initialEnabled={Boolean(athleteRow?.roast_enabled)}
            />
          </div>
        </div>
      </section>

      <p className="mt-10 text-[12px] leading-relaxed text-[var(--text-muted)]">
        This is general fitness information, not medical advice. Consult a healthcare
        professional for medical concerns and a qualified coach for programming.
      </p>
    </div>
  );
}
