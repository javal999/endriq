# EnduranceIQ (Next.js)

Training analysis UI + **Strava OAuth** ingest into Supabase. Scope **B**: Settings-oriented integrations (CSV upload route redirects to Settings).

## Where things run (AWS vs Vercel vs Supabase)

| Piece | What it is | Your preference (“AWS”) |
|--------|------------|-------------------------|
| **Supabase** | Postgres + Auth APIs (managed). **Not** “running on your AWS account” unless you self-host. | In [Supabase Dashboard](https://supabase.com/dashboard) → New project → choose a **region backed by AWS** (e.g. `ap-southeast-1` near Jakarta). |
| **Vercel** | Hosts this **Next.js** app (HTTP, API routes, OG images). | Typical setup: **Supabase (AWS region) + Vercel (app)**. |
| **Strava** | OAuth + REST API for activities. | No AWS setup — register an API application at Strava. |
| **COROS direct** | Deferred (`GET /api/coros/status`). COROS → **Strava** → EnduranceIQ is the practical path until a stable COROS API/OAuth exists. |

Supabase and Vercel are **not** the same thing (#2 vs #4): Supabase = database; Vercel = app hosting.

## Prerequisites

- Node 20+
- A Supabase project (run SQL migrations in `supabase/migrations/` in order)
- Strava API credentials (`STRAVA_*` in `.env.local`)

## Local setup

```bash
cp .env.example .env.local
# Fill Supabase URL + anon + service role + Strava vars + NEXT_PUBLIC_APP_URL.
# Optional: ANTHROPIC_API_KEY for Phase 1.1 weekly narratives (server-only).
npm install
npm run dev
```

1. **Supabase SQL**: open Project → SQL → run migrations in order: `001_initial_schema.sql`, `002_strava_oauth.sql`, `003_llm_fields.sql`, `004_llm_audit_polish.sql` (or paste combined `supabase/apply_all.sql` on a **fresh** DB only).
2. **Seed athlete**: run `supabase/seed.sql` (single user).
3. **Strava app**: [Strava API settings](https://www.strava.com/settings/api) → set **Authorization Callback** / redirect URI to match `STRAVA_REDIRECT_URI` (local: `http://localhost:3000/api/strava/callback`; production: **`https://enduranceiq.levitations.id/api/strava/callback`**).
4. Open **Settings** in the app → **Connect Strava** → approve → **Sync last 90 days**.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest (CSV parser tests; Strava path not covered yet) |
| `npm run backfill:llm` | Fill missing `llm_*` rows (needs `ANTHROPIC_API_KEY`). Use `ENDURANCEIQ_FORCE_LLM=1` to regenerate every stored week. |

## Phase 1.1 — LLM weekly copy

- **Model**: Claude Haiku via `@anthropic-ai/sdk`, called only from `generateWeeklyAnalysis` (never from a public route).
- **Cache**: `weekly_analyses.llm_*` is written once per week when missing; set `ENDURANCEIQ_FORCE_LLM=1` to regenerate. Without `ANTHROPIC_API_KEY`, the UI uses deterministic templates + findings.
- **Audit**: rows append to `llm_audit_log` per prompt type when the model runs.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — **server only**. Never ship it to the client.
- `oauth_connections` has **no** public RLS policies; only the service-role server routes touch tokens.
- Rotate Strava secret if leaked.

## Deploy (Vercel)

**Production host:** `https://enduranceiq.levitations.id` (subdomain on **`levitations.id`**). Map DNS **`enduranceiq`** → your Vercel project and assign the domain in Vercel.

1. Import repo / connect Git.
2. Set root to this folder (`projects/endurance_training/EnduranceIQ/enduranceiq`) if the monorepo root is higher.
3. Add the same env vars in Vercel → Settings → Environment Variables.
4. Update Strava **Redirect URI** to **`https://enduranceiq.levitations.id/api/strava/callback`** (must match `STRAVA_REDIRECT_URI` in Vercel).
5. Set **`NEXT_PUBLIC_APP_URL=https://enduranceiq.levitations.id`** in Vercel (same origin as redirect).

### Strava webhooks (Phase 1 — subscription endpoint ready)

The app serves **`GET/POST /api/strava/webhook`** (HTTPS required for Strava).

| Step | What you do |
|------|----------------|
| 1 | Pick a random **`STRAVA_WEBHOOK_VERIFY_TOKEN`** (e.g. `openssl rand -hex 16`). Add it to **Vercel** env (same value everywhere Strava asks for “verify token”). |
| 2 | Deploy so **`https://enduranceiq.levitations.id/api/strava/webhook`** returns **200** (GET validates subscription when Strava sends `hub.challenge`). |
| 3 | **Register one push subscription** with Strava: `POST https://www.strava.com/api/v3/push_subscriptions` with `client_id`, `client_secret`, **`callback_url=https://enduranceiq.levitations.id/api/strava/webhook`**, **`verify_token`** = your token. See [Strava webhooks](https://developers.strava.com/docs/webhooks/). |

**What works today:** Strava can **validate** the URL (GET) and **POST** events are acknowledged (**no duplicate retries**) — automatic activity import from webhook payloads is still TODO (Phase 1 Task 4). Use **Sync last 90 days** in Settings until that ships.

## Verification debt

- **`weekly_analyses`** is populated when you open a weekly report (metrics upsert each load; `llm_*` fills once when Haiku runs—missing key ⇒ deterministic copy).
- CSV ingest UI is intentionally omitted — `/upload` redirects to Settings.
- COROS direct OAuth/API **not** implemented.
