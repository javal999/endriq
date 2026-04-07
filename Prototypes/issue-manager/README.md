# Issue Manager

A working web-based prototype for managing, classifying, routing, prioritizing, and tracking 1,314 field-reported issues across 38 distribution centers after SAP implementation.

## Quick Start

```bash
cd Prototypes/issue-manager
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## What This Prototype Does

The company currently tracks issues in an Excel file with ~1,300 rows collected via Office 365 Forms. The data is messy: inconsistent division/role names, free-text issue descriptions, incomplete fields, and no structured classification or routing.

This prototype takes that real Excel data and provides:

1. **Normalized data model** — raw division/role values mapped to standard categories
2. **Automated classification** — two-level taxonomy (L1 Domain → L2 Process Area) applied via keyword matching
3. **Routing logic** — each issue mapped to the correct resolution team (Brave Hyper Care, Tiga Panglima, etc.)
4. **Priority scoring** — based on urgency, keyword severity, and process area impact
5. **Duplicate/pattern detection** — Jaccard similarity + same-area/same-L2 clustering
6. **Workflow tracking** — status lifecycle from New → Triaged → Assigned → In Progress → Resolved → Closed

## Screens

| Route | Purpose |
|---|---|
| `/` | Dashboard — volume summary, distribution by status/domain/priority/area/route |
| `/issues` | Issue list with multi-filter search (area, domain, status, priority, text) |
| `/issues/[id]` | Issue detail — full description, AI summary, classification, routing, SLA, similar issues |
| `/triage` | Triage queue — AI suggestions for classification/routing with override controls |
| `/priority` | Priority queue — open issues sorted by severity and age, filterable by team |
| `/workflow` | Kanban board — visual lifecycle of issues across status columns |
| `/patterns` | Pattern analysis — systemic clusters, hotspot areas, taxonomy heatmap, duplicate signals |
| `/groups` | Issue groups by L1/L2 — counts, acknowledge/reopen workflow |
| `/upload` | Excel upload with deduplication |
| `/submit` | Step-by-step issue submission + knowledge base hints |

## Data Pipeline

The Excel file (`Knowledge/Daily Monitoring SAP Program HRBP DC.xlsx`) was parsed using Python's `zipfile` + `xml.etree.ElementTree` to extract all 1,314 issues from the "Rekap All Area" sheet. Each issue was enriched with:

- **Normalized division** — 15+ raw values collapsed to 8 standard categories
- **Normalized role** — 40+ raw values collapsed to 10 standard categories
- **L1 Domain** — System, Process, Data, People, Infrastructure, Coordination
- **L2 Process Area** — 17 categories (SFM/SO, DO, Picking, Billing, etc.) via keyword matching
- **Priority** — P1-Critical through P3-Medium based on urgency field + keyword severity
- **Route** — team assignment derived from L1 domain
- **Status** — inferred from follow-up/progress/ticket data when available

The enriched data lives in `src/data/issues.json`.

**Report dates in Excel** use **day/month/year** (Indonesian convention). The `/api/upload` importer maps slash dates as `d/m/yy` (and Excel serials as UTC epoch days). If you rebuild `issues.json` from a workbook, re-upload through the app or reuse `parseExcelCellDateToIso` from `src/lib/excel-date.ts`. Rows where the stored date matched a US-style misread of the first `Update d/m/yy` line in **Progress** can be corrected with `node scripts/patch-seed-dates-from-progress.mjs`.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server components, zero-config routing, fast local dev |
| Styling | Tailwind CSS v4 | Utility-first, fast prototyping, clean UI |
| Data | SQLite (`/tmp` on Vercel) + optional Vercel Blob replica | Issues and group acks sync across serverless instances when Blob is configured |
| Language | TypeScript | Type safety for issue model |

Local dev: optional env only. Production: set Blob token for cross-instance consistency; set `ISSUE_MANAGER_PASSWORD` to require sign-in for writes (see below).

### Environment variables (production)

| Variable | Purpose |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | **Recommended.** Replicates each issue JSON and `_groups.json` under `issue-manager-sync/` so all instances see the same data. |
| `ISSUE_MANAGER_PASSWORD` | If set, enables auth: cookie session for uploads, submit, triage, groups, and issue PATCH/classify/similar. Dashboard and read-only pages stay public. |
| `ISSUE_MANAGER_SESSION_SECRET` | Optional. Signs session cookies; defaults to `ISSUE_MANAGER_PASSWORD` if unset. |
| `ISSUE_MANAGER_ADMIN_SECRET` | `POST /api/admin/reset` and `POST /api/admin/align-issue-dates` (header `x-admin-secret` or JSON `secret`). |
| `DISABLE_ISSUE_JSON_SEED` | Set to `1` when you want an empty DB after reset until Excel upload. |
| `CANONICAL_DATES_FROM_BUNDLE` | `0` in production so bundled JSON does not overwrite Excel dates. |

**Issue groups** use the same Blob store as issues (`issue-manager-sync/_groups.json`) so acknowledgment state is shared across instances when Blob is enabled.

**SQLite limits:** Many writers on Vercel still mean per-instance SQLite until Blob catches up; for a single shared transactional source, plan a move to Postgres/Neon (not bundled in this prototype).

## AI Simulation

The prototype simulates AI-assisted features:

- **Summarization** — first sentence extraction from free-text descriptions
- **Classification** — keyword-based L1/L2 mapping (replaceable with NLP model)
- **Routing** — rule-based team assignment from L1 domain
- **Priority** — multi-signal scoring from urgency, keywords, process area
- **Similar issue detection** — Jaccard word overlap + L2/area matching

These lightweight algorithms demonstrate the *interface* for human-AI triage. A production version would replace them with trained classifiers and embedding-based similarity.

## Demo Walkthrough

### 1. Dashboard (/)
Start here. Show stakeholders the full picture: 1,314 issues, open/closed ratio, P1/P2 volume, system issues without Hyper Care tickets.

### 2. Triage (/triage)
Show the New issues queue. For each issue, the system suggests L1 domain, L2 area, routing team, and priority. The triage operator can accept or override each suggestion.

### 3. Issue Detail (/issues/ISS-0002)
Click any issue to see the full view: AI summary, raw description, activity log, classification panel, reporter info, SLA status, and similar issues.

### 4. Priority Queue (/priority)
Filter by team (e.g., "Brave Hyper Care") to show what each resolution team should work on first. Sorted by priority then age. SLA breaches highlighted in red.

### 5. Workflow Board (/workflow)
Kanban view of the issue lifecycle. Shows how issues flow from New to Closed.

### 6. Pattern Analysis (/patterns)
Systemic issues flagged across 5+ DCs. Heatmap shows which L1/L2 combinations produce the most issues. Potential duplicate clusters identified.

## Transition Design

This prototype bridges Excel-based operations to a structured workflow:

| Current State | Prototype | Future State |
|---|---|---|
| Raw Excel with inconsistent fields | Normalized + enriched JSON data model | Structured database with validated intake |
| Manual classification by HRBP | AI-suggested classification with human override | Trained classifier with confidence scoring |
| No routing logic | Rule-based routing from taxonomy | Routing engine with SLA integration |
| No prioritization | Multi-signal priority scoring | Weighted scoring with operational impact data |
| No duplicate detection | Jaccard similarity + area/L2 clustering | Embedding-based semantic similarity |
| Status tracked in free-text | Lifecycle statuses with Kanban view | Full workflow with notifications and escalation |

## Deploy to Vercel

From this directory (`Prototypes/issue-manager`), set the Vercel project **root** to this folder (not the monorepo root).

**Paragon deployment (separate project):** link the app to a dedicated project name so it does not overwrite the older demo:

```bash
npm install
rm -rf .vercel   # only if you need to point this folder at a new Vercel project
npx vercel link --project paragon-issue-manager --yes
npx vercel --prod
```

Copy environment variables from the previous project in the Vercel dashboard (Blob token, passwords, flags) onto `paragon-issue-manager`, then redeploy.

**One-off date corrections (14 issue IDs):** after deploying code that includes `canonical-date-fixes.ts`, call `POST /api/admin/align-issue-dates` with the same secret as reset. See [scripts/ALIGN-ISSUE-DATES.md](./scripts/ALIGN-ISSUE-DATES.md).

**Dashboard vs All Issues count mismatch:** the home dashboard and every page that calls `getAllIssues()` use the same data path. If the dashboard looked stale (e.g. 1314 vs 1315 on `/issues`), it was because `/` was statically prerendered. Those routes now set `dynamic = "force-dynamic"` so totals refresh on each request like `/issues`.

**New issues missing with Blob enabled:** (1) `list()` is paginated (~1000 per page). (2) **Reads** no longer download every issue JSON on each request: `getAllIssues()` lists all blob paths, then **fetches JSON only for IDs missing from this instance’s SQLite** and upserts them into `/tmp`. That keeps reload fast and survives cold Lambdas that only had bundled seed data. (3) **New IDs** use `replicaMaxIssueSerialFromPaths()` so the next `ISS-####` matches Blob without loading all bodies. (4) If `replicaPutIssue` fails, the API errors instead of silently leaving the row only on one instance.

**Important — serverless SQLite:** Each Vercel function instance has its own `/tmp` SQLite file. Without an extra step, a new issue written on one instance does not appear on `/issues` when another instance serves the page.

**Fix (required for production demo accuracy):** Add [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) to the project (Storage → Create Blob store). Vercel injects `BLOB_READ_WRITE_TOKEN`. The app then mirrors every insert/update to Blob and **merges** Blob copies with local SQLite on read, so lists and detail views stay consistent across instances.

**Private vs public store:** If you created a **Private** Blob store (Vercel’s default in the dashboard), the app uses `access: "private"` and the SDK `get()` API automatically—no extra env. If your store is **Public**, set `BLOB_STORE_ACCESS=public` in the project environment. You cannot turn an existing private store into a public one in place; to use public URLs you must [create a new public store](https://vercel.com/docs/vercel-blob/public-storage#creating-a-public-blob-store) and connect it (new token).

Seeding uses the bundled `src/data/issues.json` (no filesystem path dependency). SQLite in `/tmp` is still ephemeral; Blob holds the shared copy of issues created or updated after deploy.

## Testing

```bash
npm run lint
npm run build
npx playwright install chromium webkit   # first time only
npm run test:e2e
```

Details: [TESTING.md](./TESTING.md).
