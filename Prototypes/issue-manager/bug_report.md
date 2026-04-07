# Issue Manager Prototype — E2E QA Report

**Stack:** Next.js 16 (App Router), React 19, SQLite (`better-sqlite3`), Playwright.  
**Sources of truth reviewed:** `Deliverables/SAP-Issue-Management-System/PRD-issue-management-system.md` (full read), prototype under `Prototypes/issue-manager/`.  
**Run:** `npm run test:e2e` (2026-04-02). **22 tests, 22 passed** after fixes below.

---

## 1. PRD-derived catalog (features, entities, flows)

This list is what the **PRD describes** for the full product. The **Next.js prototype implements a subset** (web UI + SQLite + optional Vercel Blob). Items without a prototype UI/API are marked **Not in prototype**.

### Entities

| Entity | PRD | Prototype |
|--------|-----|-----------|
| Issue (ISSUE_ID, dates, area, divisi, role, text, L1/L2/L3, priority, status, route, PIC, tickets, duplicate ref, AI fields, resolution) | §11 | Issue row in SQLite; L3 folded into `l2ProcessArea` / text; no separate `DUPLICATE_OF`, `PIC_OWNER`, `TIKET_HC_*` fields as first-class form (partial) |
| Issue group / systemic cluster | H-02, patterns | `IssueGroup` + `/groups` |
| User / session | §7 | Optional password cookie (`ISSUE_MANAGER_PASSWORD`) |
| Playbook | §14.5 | Not in prototype |
| Excel workbook as SoT | §3 | Replaced by app + seed JSON + upload |

### User flows (PRD §8)

| ID | Flow | Prototype |
|----|------|-----------|
| UC-1 | Issue submission | `/submit` + `POST /api/issues` |
| UC-2 | Normalization / AI summary | Heuristic `/api/classify` (not LLM batch) |
| UC-3 | Classification | `/triage` + `PATCH /api/issues/[id]` |
| UC-4 | Routing | Rule-based `routeTo` in types + triage overrides |
| UC-5 | Prioritization | Priority on issue + `/priority` |
| UC-6 | Status tracking | `/issues/[id]` ResolutionForm + PATCH |
| UC-7 | Duplicate detection | `/api/similar`, triage patterns — not full DUPLICATE_OF workflow |
| UC-8 | Retrospective analytics | `/`, `/patterns` (partial vs PRD dashboards) |
| UC-9 | Action recommendation | Not in prototype |

### Functional modules (PRD §9) — coverage note

- **A** Intake: web submit + upload (A-01 partial); PRD 38 DCs vs **35 areas** in submit dropdown — **gap**.
- **B** Master record: largely present; full 28-column PRD model not all exposed in UI.
- **C** Normalization: heuristic, not full C-05/C-06 admin batch tools in UI.
- **D** Classification: L1/L2 enums match; L3 as separate field not as PRD.
- **E–F** Routing / priority: present in data + UI.
- **G** Status / SLA / stale: partial (`checkSlaBreach` in UI); not full G-02 audit trail.
- **H** Duplicate: partial.
- **I–J** Reporting: dashboard, priority, workflow, patterns — not Power BI.
- **K** AI: suggestions without separate persisted `AI_L1_SUGGESTION` audit columns.

### Acceptance criteria (PRD §10)

Only criteria that map to **implemented** behavior were automated (intake validation, list filters, triage transition, API validation, persistence on local `next start`). Excel-specific AC (row colors, COUNTIF) were **not** executed against Excel.

---

## Bug #1: Triage E2E expected a visible “Saved” label after Accept

- **Severity:** Low (test design; minor UX expectation)
- **Area:** Triage — `TriageIssueCard` + E2E `triage-and-crosspage.spec.ts`
- **PRD Reference:** UC-3 / AC-2.5 (status transition must persist — persistence itself was fine)
- **What happened:** Playwright waited for the text `Saved` after **Accept & Route**. The assertion timed out.
- **What should happen:** After a successful PATCH, the issue should be **Triaged** in the database and on the issue detail page. A transient “Saved” chip is optional UX.
- **Root cause:** On success the client calls `router.refresh()`. The issue moves from **New** to **Triaged**, so it **drops out of the New filter** and the card **unmounts** before the “Saved” span is reliably visible (often zero frames).
- **Fix applied:** E2E now waits for **`PATCH /api/issues/:id` response OK**, then asserts **detail** and **Triaged queue** (`tests/e2e/triage-and-crosspage.spec.ts`).
- **Test status:** Passing after fix

## Bug #2: Playwright browser binaries missing (environment)

- **Severity:** Medium (blocks CI/local until install)
- **Area:** Tooling / developer setup
- **PRD Reference:** §20 QA (automation prerequisites)
- **What happened:** `browserType.launch: Executable doesn't exist` for Chromium.
- **What should happen:** `npm run test:e2e` runs after one-time `npx playwright install chromium` (or `playwright install`).
- **Root cause:** Fresh machine or cache path without downloaded browsers.
- **Fix applied:** Documented in `TESTING.md`; browsers installed in the validation environment.
- **Test status:** N/A (environment)

---

## 3. Artifacts

| Path | Role |
|------|------|
| `tests/e2e/smoke.spec.ts` | Route smoke |
| `tests/e2e/issue-intake-persistence.spec.ts` | UC-1 / persistence |
| `tests/e2e/issues-views-and-crud.spec.ts` | List filter + detail |
| `tests/e2e/triage-and-crosspage.spec.ts` | Triage PATCH + cross-page |
| `tests/e2e/dashboard-priority.spec.ts` | Dashboard + priority queue |
| `tests/edge_cases/validation-api.spec.ts` | API + empty list (PRD §20-style) |

---

## 4. Ambiguous PRD items (not guessed in tests)

- Exact **38** DC names vs prototype **35** — test does not assert count; mismatch flagged above.
- **Verified** status in PRD lifecycle vs prototype **STATUSES** (no separate “Verified”) — no E2E for that transition.
- **Brave Hyper Care** ticket automation (E-04/E-06) — not implemented; not tested.

---

## PRD vs prototype vs automated tests (plain language)

The PRD lists **dozens** of requirement rows (A-01 … K-06) plus **acceptance blocks** (AC-1 … AC-8). That is the **target product** (Excel + later Lists/Power BI + Hyper Care, full data model, SLA rules, etc.). The **prototype** is a smaller web app. Automated tests only check what **exists in the repo** and what we **wrote assertions for**.

Do **not** read a single percentage as “the product is X% compliant with the PRD.” Use three buckets:

### Bucket 1 — PRD-aligned behavior that **is** exercised by the 22 tests

| PRD touchpoint | What the tests actually check |
|----------------|------------------------------|
| UC-1 / AC-1.2 / A-03–A-04 (partial) | Submit wizard completes; new issue gets an `ISS-*` id; description persists after reload and appears in search (`issue-intake-persistence`). |
| AC-1.1 / A-03 (partial) | POST create returns an id; duplicate fingerprint returns **409** (`validation-api`). |
| Intake validation | Issue text under **3** characters rejected; missing **area** rejected (`validation-api`). |
| I-01 (partial) | Issues list **area** query filter (`issues-views-and-crud`). |
| UC-3 / AC-2.5 (partial) | **Accept & Route** triggers successful **PATCH**; detail shows **Triaged**; issue appears under Triaged tab (`triage-and-crosspage`). |
| D / F / E (partial, via data + triage) | PATCH rejects **invalid status**; triage PATCH succeeds with seeded valid L1/L2/route/priority (`validation-api` + triage flow). |
| I-02 / I-03 (partial) | Dashboard and priority queue **render** with expected headings/stats/table structure (`smoke`, `dashboard-priority`). |
| UC-8 (partial) | Patterns page **loads** (`smoke`). |
| Module B duplicate signal (partial) | Dedup hash collision returns **409** (not full H-01 DUPLICATE_OF UX). |
| Empty / edge UI | No rows for impossible search query (`validation-api`). |
| Core navigation | Main routes load (`smoke`): dashboard, issues, detail, workflow, groups, upload, submit, triage, priority, patterns, login. |

### Bucket 2 — In the **prototype**, but **not** covered (or only trivially) by current tests

Examples: **Excel upload** (only “page loads”), **groups** acknowledge/reopen flows, **`/api/similar`** behavior, **auth-gated** flows when `ISSUE_MANAGER_PASSWORD` is set, **every** canonical dropdown count (PRD 38 DCs vs 35 in UI), **resolution** PATCH appending notes, **SLA / stale** logic correctness, **workflow** column counts beyond layout, full **status ladder** (e.g. Verified), **issue groups** CRUD, **admin** routes.

These can be added later as targeted tests.

### Bucket 3 — In the **PRD**, **not** built in this prototype

Examples: O365 Forms **pipeline**, **Brave Hyper Care** ticket creation/linkage (E-04/E-06), **Power Automate** / **Power BI**, **playbook** (UC-9), **Microsoft Lists** migration, full **28-column** model and audit fields (G-02, K-06), **auto**-routing without BCR (E-05), **notifications** (G-09), most **J-*** retrospective automation, **Phase 3** guided form fields (A-08–A-13).

No automated test can “cover” these until the product implements them.

---

## Summary

- Total tests run: **22**
- Tests passed: **22**
- Bugs found: **2** (1 test/UX timing, 1 environment)
- Bugs fixed: **2** (test assertion + install/docs)
- Open/unresolved issues: **0** for the scoped prototype E2E run
- Edge cases tested: **5** (short text, missing area, duplicate POST, invalid PATCH status, empty search)
- PRD alignment: use **Bucket 1–3** above. The suite exercises **one thin slice per implemented area** (intake, list/filter, triage PATCH, dashboard/priority shell, API guards, persistence on local `next start`). It does **not** map one-to-one to all PRD rows.
