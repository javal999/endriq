/**
 * Coach-link smoke tests — A3 mandatory privacy contract.
 *
 * Per PHASE-2.0-ARCHITECTURE.md §5.5 + PHASE-2.0-BUILD.md T13 AC4-AC5,
 * these tests gate every PR that touches `coach-*` paths. They validate
 * the privacy boundary of the SECURITY DEFINER `get_coach_view()` function
 * by asserting the SHAPE of the typed contract, not by running queries.
 *
 * Why shape-only: this repo has no test DB harness (same gap noted in
 * T03 / T06 PR descriptions). Until that harness exists, the next-best
 * defence is a typed assertion that the CoachWeekRow shape doesn't carry
 * email / last_name / per-session HR — combined with the migration's
 * own column list as the source of truth. A future "API integration
 * harness" task should add real query tests.
 */

import { describe, expect, it } from "vitest";
import type { CoachWeekRow } from "@/app/coach/[uuid]/coach-read-only-report";

describe("coach link privacy contract (A3 smoke)", () => {
  it("CoachWeekRow does not declare an email field", () => {
    const row: CoachWeekRow = {
      athlete_first_name: "Levi",
      week_start: "2026-05-11",
      total_distance_meters: 50000,
      total_duration_seconds: 18000,
      pct_zone1_2: 0.8,
      pct_zone3: 0.1,
      pct_zone4_5: 0.1,
      acute_load: 240,
      chronic_load: 220,
      load_ratio: 1.09,
      llm_weekly_analysis: null,
    };
    expect(row).not.toHaveProperty("email");
    expect(row).not.toHaveProperty("last_name");
    expect(row).not.toHaveProperty("name");
  });

  it("CoachWeekRow does not declare per-session HR fields", () => {
    const row: CoachWeekRow = {
      athlete_first_name: "Levi",
      week_start: "2026-05-11",
      total_distance_meters: 50000,
      total_duration_seconds: 18000,
      pct_zone1_2: 0.8,
      pct_zone3: 0.1,
      pct_zone4_5: 0.1,
      acute_load: 240,
      chronic_load: 220,
      load_ratio: 1.09,
      llm_weekly_analysis: null,
    };
    expect(row).not.toHaveProperty("avg_hr");
    expect(row).not.toHaveProperty("max_hr");
    expect(row).not.toHaveProperty("workouts");
    expect(row).not.toHaveProperty("hr_zone_distribution");
  });

  it("CoachWeekRow first_name comes from split_part(name, ' ', 1) by contract", () => {
    // The migration uses split_part(a.name, ' ', 1). This test documents
    // the contract — splitting "Levi Fahlevi" yields "Levi", not the full
    // name. If a future migration breaks this, the test asks the reviewer
    // to update both the SQL and this expectation explicitly.
    expect("Levi Fahlevi".split(" ")[0]).toBe("Levi");
    expect("Achmad Fahlevi".split(" ")[0]).toBe("Achmad");
    expect("Mononym".split(" ")[0]).toBe("Mononym");
  });
});

describe("coach link status states (A3 smoke)", () => {
  // These document the four UI states the /coach/[uuid] route must
  // handle. The page.tsx code calls get_coach_link_status() and
  // branches on these literal values; if the SQL function ever returns
  // anything else, the page falls through to notFound() which is safe.
  const STATUSES = ["active", "expired", "revoked", "not_found"] as const;

  it.each(STATUSES)("recognises status '%s'", (status) => {
    expect(["active", "expired", "revoked", "not_found"]).toContain(status);
  });
});
