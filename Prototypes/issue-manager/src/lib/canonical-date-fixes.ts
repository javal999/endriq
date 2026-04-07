/**
 * Canonical `date` (YYYY-MM-DD) for issues that were corrected (month/day swap vs source).
 * Used by POST /api/admin/align-issue-dates — must match `src/data/issues.json`.
 */
export const CANONICAL_ISSUE_DATES: Record<string, string> = {
  "ISS-0370": "2026-03-06",
  "ISS-0371": "2026-03-06",
  "ISS-0372": "2026-03-07",
  "ISS-0373": "2026-03-08",
  "ISS-0374": "2026-03-08",
  "ISS-0375": "2026-03-07",
  "ISS-0391": "2026-03-07",
  "ISS-0392": "2026-03-09",
  "ISS-0393": "2026-03-09",
  "ISS-0394": "2026-03-09",
  "ISS-0395": "2026-03-09",
  "ISS-0399": "2026-03-09",
  "ISS-0400": "2026-03-11",
  "ISS-0401": "2026-03-11",
};
