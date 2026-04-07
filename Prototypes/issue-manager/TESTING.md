# Testing and security notes

## Automated checks

```bash
npm run lint
npm run build
npx playwright install chromium   # once per machine / CI image
npm run test:e2e
```

End-to-end tests use Playwright against **Chromium** only (see `playwright.config.ts`). Install browsers before the first run:

```bash
npx playwright install chromium
```

## Functional coverage

Tests live under `tests/e2e/` (flows by domain) and `tests/edge_cases/` (API validation, empty states). See `bug_report.md` for the PRD mapping and last QA summary.

Suites cover:

- Smoke: main routes (dashboard, issues, detail, workflow, groups, upload, submit, triage, priority, patterns, login).
- Intake + persistence: full submit wizard; issue text survives reload and search.
- List/filter + detail resolution form.
- Triage Accept → PATCH → Triaged on detail and triage tab.
- Dashboard stats and priority table headers.
- Edge: `POST /api/issues` validation, duplicate 409, invalid `PATCH` status, empty issues search.

## Security measures in this prototype

| Area | Mitigation |
|------|------------|
| SQL injection | `better-sqlite3` prepared statements; no string-built SQL from user input |
| XSS | React escapes text; no `dangerouslySetInnerHTML` |
| Upload abuse | 15 MB max; `.xlsx`/`.xls` extension; magic-byte check (ZIP or OLE) |
| Status tampering | `PATCH /api/issues/[id]` only allows values from `STATUSES` |
| Resolution spam | Resolution text capped at 10,000 characters |
| HTTP headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |

## Known limitations (prototype)

- **No authentication.** Anyone who can reach the deployment can read and change data via the UI and APIs. For real production, add auth (e.g. SSO, Vercel protection, or middleware).
- **SQLite on Vercel** lives in `/tmp` **per serverless instance** (not shared). New issues and updates are copied to **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set; reads merge Blob into SQLite on each request. Without that token on Vercel, inserts used to “succeed” but **vanished after reload** when another instance answered. Production must set `BLOB_READ_WRITE_TOKEN` (optional `BLOB_STORE_ACCESS=public` if the store is public). Only for throwaway demos: `ALLOW_EPHEMERAL_SQLITE_ON_VERCEL=1` allows writes without Blob (still not durable across instances).
- **Rate limiting** is not implemented on API routes.

## Manual cross-browser checks

After deploy, open the production URL in:

- Chrome (desktop)
- Safari (desktop or iOS)

Confirm sidebar navigation, issue detail resolution form, and Excel upload (small file) work.
