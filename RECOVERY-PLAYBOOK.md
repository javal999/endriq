# EnduranceIQ — recovery playbook

**Owner:** Levi · **Last updated:** 2026-05-17 (Phase 2.0 ship)

This document is the runbook for restoring service when something is on fire.
It's deliberately short — three failure modes, three procedures. Optimised for
the case where you're reading this at 2 AM with one hand on a coffee.

---

## Failure mode 1 — production app is down (Vercel)

**Symptoms:** `endriq.levitations.id` returns 5xx, Vercel dashboard shows the
latest deploy in a failing state.

**Procedure:**

1. Open Vercel project → Deployments → find the last known-good deploy (green
   tick, before the bad one).
2. Click the `…` menu on that deploy → **Promote to Production**.
3. Vercel re-points the production alias in ~30 seconds.
4. Verify `https://endriq.levitations.id/learn` returns 200.
5. Open a GitHub issue describing what broke; do NOT immediately re-deploy
   `main`.

**Rollback boundary:** you can promote any past deploy from the last 90 days.
Older than that, you're rebuilding from `main` HEAD.

---

## Failure mode 2 — Supabase database corruption / accidental drop

**Symptoms:** Queries that worked yesterday return zero rows, schema mismatch
errors in app logs, an athlete reports their data is gone.

**Procedure:**

1. Open Supabase Dashboard → your project → **Database** → **Backups**.
2. Pro tier retains 7 days of daily backups + point-in-time recovery (PITR).
3. Choose **Point-in-time recovery** → pick a timestamp before the incident.
4. Supabase prompts to create a new project from the backup. Accept.
5. Once restored, in the original project run:
   ```sql
   -- Verify the restore landed correctly. Counts should match the historical
   -- expectation from your monitoring snapshot.
   SELECT 'athletes' AS table, COUNT(*) FROM athletes
   UNION ALL SELECT 'workouts', COUNT(*) FROM workouts
   UNION ALL SELECT 'weekly_analyses', COUNT(*) FROM weekly_analyses
   UNION ALL SELECT 'races', COUNT(*) FROM races
   UNION ALL SELECT 'planned_sessions', COUNT(*) FROM planned_sessions
   UNION ALL SELECT 'strength_completions', COUNT(*) FROM strength_completions
   UNION ALL SELECT 'recovery_check_in', COUNT(*) FROM recovery_check_in
   UNION ALL SELECT 'coach_links', COUNT(*) FROM coach_links;
   ```
6. Update Vercel env vars (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) to the new
   project, redeploy.

**Important — RPC functions:** The SECURITY DEFINER functions
(`decrement_llm_quota`, `get_coach_view`, `get_coach_link_status`) restore
with the backup. After restore, verify both:
```sql
SELECT proname, prosecdef FROM pg_proc
WHERE proname IN ('decrement_llm_quota', 'get_coach_view', 'get_coach_link_status');
-- expect prosecdef = t for all three
```

**RLS policies:** The backup includes them. Spot-check on the restored DB:
```sql
SELECT tablename, COUNT(*) FROM pg_policies
WHERE tablename IN ('athletes', 'workouts', 'weekly_analyses', 'races',
                    'planned_sessions', 'strength_completions',
                    'recovery_check_in', 'coach_links', 'oauth_connections',
                    'llm_audit_log', 'llm_feedback')
GROUP BY tablename;
-- expect ≥ 1 policy per row
```

---

## Failure mode 3 — Strava or COROS integration broken

**Symptoms:** Sync route returns 5xx, athletes report missing workouts.

**Procedure:**

1. Open Vercel logs for `/api/strava/sync` or `/api/coros/sync` — look for the
   first error message.
2. If it's a token-decryption error, the `TOKEN_ENCRYPTION_KEY` env var may
   have been rotated by mistake. Restore from your password manager.
3. If it's an upstream 5xx from Strava/COROS, check the provider's status
   page first (status.strava.com / openapi.coros.com). Wait it out; the
   Upstash rate limiter will back off automatically.
4. If a specific athlete is affected, ask them to re-connect from
   `/settings → Integrations → Reconnect`.

**Webhook replay (Strava only):** if Strava sent activity webhooks during
the outage, they're gone — Strava doesn't replay. The athlete must use the
manual "Sync now" button to backfill, which reads via the activity API.

---

## Quarterly recovery drill

Architecture §6.3 commits us to actually exercising this playbook quarterly.
Steps to do once a quarter (calendar reminder set):

1. In Supabase, **clone the prod project** via Branches feature to a new
   shadow project (no production traffic).
2. Run Failure-mode-2 steps 1–5 against the shadow.
3. Record time-to-recovery (target: <30 minutes for a small DB).
4. Confirm the verification queries above all return expected counts.
5. Delete the shadow project to control cost.

---

## Drill log

| Date | Driller | TTR | Notes |
|---|---|---|---|
| — | — | — | (first drill TBD post-Phase-2.0-ship) |

---

## Contact escalation

- Supabase Pro support: dashboard → Help; response < 24h
- Vercel Pro support: dashboard → Support; response < 24h
- Anthropic: dashboard → contact; response varies
- Strava developer support: developers@strava.com; slow

Add yourself to status pages: status.supabase.com, status.vercel.com,
status.strava.com.
