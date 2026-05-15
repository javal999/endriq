# Development Guide

Local setup, env vars, database migrations, deployment, and security
notes for contributors or self-hosters.

> For a product overview see [README.md](README.md).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Hosting | Vercel |
| AI narratives | Claude Haiku (Anthropic) — server-side only |
| Share cards | `@vercel/og` (Satori) |
| i18n | next-intl v4 |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` |

---

## Local setup

```bash
cp .env.example .env.local
# Fill in the values — see the table below
npm install
npm run dev
```

**Run DB migrations** via Supabase SQL editor — execute each file in
`supabase/migrations/` in numeric order (001 → 013), or paste
`supabase/apply_all.sql` on a fresh database only.

---

## Required env vars

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (**server only — never expose to client**) |
| `STRAVA_CLIENT_ID` | strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | strava.com/settings/api |
| `STRAVA_REDIRECT_URI` | `http://localhost:3000/api/strava/callback` (local) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (local) |
| `ANTHROPIC_API_KEY` | console.anthropic.com — optional; app falls back to static templates if unset |
| `STATE_SIGNING_SECRET` | `openssl rand -hex 32` — signs OAuth state to prevent CSRF |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -hex 32` — encrypts OAuth tokens at rest (AES-256-GCM) |
| `UPSTASH_REDIS_REST_URL` | upstash.com — optional; rate limiting skips gracefully if unset |
| `UPSTASH_REDIS_REST_TOKEN` | upstash.com |
| `COROS_CLIENT_ID` | opens.coros.com — optional; only needed for COROS direct integration |
| `COROS_CLIENT_SECRET` | opens.coros.com |

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests (140 tests) |
| `npm run backfill:llm` | Fill missing LLM narrative rows (needs `ANTHROPIC_API_KEY`) |
| `npx tsx scripts/encrypt-tokens.ts` | One-time backfill of token encryption after deploying migration 012 |

---

## Security notes

- OAuth state is HMAC-SHA256 signed and bound to a nonce cookie —
  forged callbacks return 403.
- OAuth tokens encrypted at rest (AES-256-GCM) via `TOKEN_ENCRYPTION_KEY`.
- Strava webhook POST validates `X-Hub-Signature` header.
- Rate limiting on feedback, sync, and share card endpoints via Upstash.
- Advisory lock prevents concurrent token refresh races.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — never in client code.
- Rotate `STATE_SIGNING_SECRET` and `TOKEN_ENCRYPTION_KEY` if leaked;
  re-run `scripts/encrypt-tokens.ts` after rotating the encryption key.

---

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Leave **Root Directory** blank (app is at repo root).
3. Add all env vars in Vercel → Settings → Environment Variables.
4. Set `NEXT_PUBLIC_APP_URL` to your production domain.
5. Set `STRAVA_REDIRECT_URI` to `https://yourdomain.com/api/strava/callback`.
6. Update Strava's **Authorization Callback Domain** to match.

### Strava webhooks

Register a push subscription once after deploying:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d callback_url=https://yourdomain.com/api/strava/webhook \
  -d verify_token=YOUR_STRAVA_WEBHOOK_VERIFY_TOKEN
```

Set `STRAVA_WEBHOOK_VERIFY_TOKEN` to the same value in Vercel env.
