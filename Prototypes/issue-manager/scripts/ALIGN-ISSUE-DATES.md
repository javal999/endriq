# Align production dates (ISS-0370 … ISS-0401)

Corrects **month/day** for 14 issue IDs: updates SQLite `date`, recomputes **`dedupHash`** (it includes `date`), and writes the row to **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set.

Canonical values live in `src/lib/canonical-date-fixes.ts` (kept in sync with `src/data/issues.json`).

## Recommended: admin API (after deploy)

Requires `ISSUE_MANAGER_ADMIN_SECRET` in the Vercel project (same as `/api/admin/reset`).

```bash
curl -sS -X POST "https://YOUR_HOST/api/admin/align-issue-dates" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"
```

Or body:

```bash
curl -sS -X POST "https://YOUR_HOST/api/admin/align-issue-dates" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_ADMIN_SECRET"}'
```

Response JSON:

- `updated`: `{ id, from, to }[]` per changed row
- `skipped`: `{ id, reason }[]` — e.g. `not_found`, `already_aligned`, `dedup_hash_conflict_with_ISS-xxxx`

### Serverless caveat

SQLite lives under `/tmp` per instance. The handler loads from Blob into local DB if an ID is missing locally, then updates and `replicaPutIssue`. Hitting the endpoint **once** is usually enough for Blob-backed deploys; if an instance never receives traffic, its `/tmp` DB can stay stale until it serves a request that reads merged data.

## Raw SQL (local SQLite file only)

**Not recommended on Vercel** (no stable shell DB). Use only if you maintain a **local** `issues.db` copy.

Updating **`date` without `dedupHash`** breaks deduplication logic. The API path always sets both.

If you must patch SQL by hand, recompute:

`dedupHash = MD5( lower(trim(area)) | lower(trim(date)) | lower(trim(divisi)) | lower(trim(role)) | lower(trim(issue)) )`  
(with `|` as separator, same as `computeDedupHash` in `src/lib/db.ts`).

SQLite 3.44+:

```sql
-- Example pattern (replace placeholders with real column values per row):
-- hex(md5(lower(area)||'|'||lower(date)||'|'||...))  -- must match app exactly
```

Because the exact hash depends on all five fields, **prefer the API** unless you script the hash in Node/Python.

## After running

- Redeploy is **not** required if only data changed.
- Optional: call the endpoint twice; second run should report `already_aligned` for all IDs.
