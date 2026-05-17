/**
 * F15 periodisation tests — covers every race_type × every phase boundary.
 *
 * Tests are written against the PRD §5.8 pseudocode literally. Boundary
 * conditions are exhaustive: each phase transition gets the on-boundary day
 * and the next-day-after to lock the inequality direction.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.8 (AC2 + AC4 + AC5).
 */

import { describe, expect, it } from "vitest";
import {
  currentPhase,
  daysToRace,
  type PrimaryRaceLike,
} from "./periodization";
import { allRaceTypes, taperBoundaryDays } from "@/lib/data/taperBoundaries";

/** Build a primary race whose date is exactly `offsetDays` from today (UTC). */
function raceOffsetBy(
  offsetDays: number,
  raceType: string,
  today: Date,
): PrimaryRaceLike {
  const t = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const raceMs = t + offsetDays * 24 * 60 * 60 * 1000;
  const d = new Date(raceMs);
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { race_date: iso, race_type: raceType };
}

const TODAY = new Date("2026-05-17T08:00:00Z");

describe("currentPhase — null / invalid inputs", () => {
  it("returns 'transition' when primary race is null", () => {
    expect(currentPhase(null, TODAY)).toBe("transition");
  });

  it("returns 'transition' when primary race is undefined", () => {
    expect(currentPhase(undefined, TODAY)).toBe("transition");
  });

  it("returns 'transition' when race_date is not parseable", () => {
    expect(
      currentPhase({ race_date: "not-a-date", race_type: "marathon" }, TODAY),
    ).toBe("transition");
  });

  it("returns 'transition' when race_date is empty string", () => {
    expect(currentPhase({ race_date: "", race_type: "marathon" }, TODAY)).toBe(
      "transition",
    );
  });
});

describe("currentPhase — post-race phases", () => {
  it("returns 'recovery' the day after the race", () => {
    expect(currentPhase(raceOffsetBy(-1, "marathon", TODAY), TODAY)).toBe(
      "recovery",
    );
  });

  it("returns 'recovery' 14 days after the race (boundary)", () => {
    expect(currentPhase(raceOffsetBy(-14, "marathon", TODAY), TODAY)).toBe(
      "recovery",
    );
  });

  it("returns 'transition' 15 days after the race (one past recovery)", () => {
    expect(currentPhase(raceOffsetBy(-15, "marathon", TODAY), TODAY)).toBe(
      "transition",
    );
  });

  it("returns 'transition' 6 months after the race", () => {
    expect(currentPhase(raceOffsetBy(-180, "marathon", TODAY), TODAY)).toBe(
      "transition",
    );
  });
});

describe("currentPhase — race_day (offset 0) → race_week", () => {
  it.each(allRaceTypes())(
    "race day itself is 'race_week' for %s",
    (raceType) => {
      expect(currentPhase(raceOffsetBy(0, raceType, TODAY), TODAY)).toBe(
        "race_week",
      );
    },
  );
});

describe("currentPhase — race_week boundary per race type", () => {
  it.each(allRaceTypes())(
    "%s: raceWeekDays day = 'race_week'; raceWeekDays + 1 = 'taper'",
    (raceType) => {
      const { raceWeekDays } = taperBoundaryDays(raceType);
      expect(
        currentPhase(raceOffsetBy(raceWeekDays, raceType, TODAY), TODAY),
      ).toBe("race_week");
      expect(
        currentPhase(raceOffsetBy(raceWeekDays + 1, raceType, TODAY), TODAY),
      ).toBe("taper");
    },
  );
});

describe("currentPhase — taper boundary per race type", () => {
  it.each(allRaceTypes())(
    "%s: taperDays day = 'taper'; taperDays + 1 = 'pre_competition'",
    (raceType) => {
      const { taperDays } = taperBoundaryDays(raceType);
      expect(currentPhase(raceOffsetBy(taperDays, raceType, TODAY), TODAY)).toBe(
        "taper",
      );
      expect(
        currentPhase(raceOffsetBy(taperDays + 1, raceType, TODAY), TODAY),
      ).toBe("pre_competition");
    },
  );
});

describe("currentPhase — pre_competition / specific_prep / general_prep boundaries", () => {
  // These boundaries are uniform across race types (PRD §5.8: 42, 84, 154 days).
  it("42 days out → 'pre_competition' (boundary)", () => {
    expect(currentPhase(raceOffsetBy(42, "marathon", TODAY), TODAY)).toBe(
      "pre_competition",
    );
  });

  it("43 days out → 'specific_prep'", () => {
    expect(currentPhase(raceOffsetBy(43, "marathon", TODAY), TODAY)).toBe(
      "specific_prep",
    );
  });

  it("84 days out → 'specific_prep' (boundary)", () => {
    expect(currentPhase(raceOffsetBy(84, "marathon", TODAY), TODAY)).toBe(
      "specific_prep",
    );
  });

  it("85 days out → 'general_prep'", () => {
    expect(currentPhase(raceOffsetBy(85, "marathon", TODAY), TODAY)).toBe(
      "general_prep",
    );
  });

  it("154 days out → 'general_prep' (boundary)", () => {
    expect(currentPhase(raceOffsetBy(154, "marathon", TODAY), TODAY)).toBe(
      "general_prep",
    );
  });

  it("155 days out → 'transition' (further than 22 weeks)", () => {
    expect(currentPhase(raceOffsetBy(155, "marathon", TODAY), TODAY)).toBe(
      "transition",
    );
  });

  it("365 days out → 'transition'", () => {
    expect(currentPhase(raceOffsetBy(365, "marathon", TODAY), TODAY)).toBe(
      "transition",
    );
  });
});

describe("currentPhase — PRD AC4 / AC5 cross-race spot checks", () => {
  // Note: PRD AC4 prose says "marathon 22d out → taper" but the PRD pseudocode
  // uses `daysToRace <= taperDays` (21 for marathon), which puts day-22 just
  // past the boundary → pre_competition. Implementation follows the pseudocode
  // (authoritative); these tests pin that behaviour explicitly.
  it("marathon 21d out → 'taper' (on the boundary)", () => {
    expect(currentPhase(raceOffsetBy(21, "marathon", TODAY), TODAY)).toBe(
      "taper",
    );
  });

  it("marathon 22d out → 'pre_competition' (one past taper boundary)", () => {
    expect(currentPhase(raceOffsetBy(22, "marathon", TODAY), TODAY)).toBe(
      "pre_competition",
    );
  });

  it("5K 22d out → 'pre_competition' (taper window 7d)", () => {
    expect(currentPhase(raceOffsetBy(22, "5k", TODAY), TODAY)).toBe(
      "pre_competition",
    );
  });

  it("ironman_full 28d out → 'pre_competition' (taper is 21d)", () => {
    expect(currentPhase(raceOffsetBy(28, "ironman_full", TODAY), TODAY)).toBe(
      "pre_competition",
    );
  });

  it("ultramarathon 28d out → 'taper' (28d window)", () => {
    expect(currentPhase(raceOffsetBy(28, "ultramarathon", TODAY), TODAY)).toBe(
      "taper",
    );
  });

  it("ultramarathon 29d out → 'pre_competition' (one past 28d boundary)", () => {
    expect(currentPhase(raceOffsetBy(29, "ultramarathon", TODAY), TODAY)).toBe(
      "pre_competition",
    );
  });
});

describe("currentPhase — race_type fallback", () => {
  it("unknown race_type uses 'other_endurance' defaults (taper 14d)", () => {
    expect(
      currentPhase(
        { race_date: raceOffsetBy(14, "marathon", TODAY).race_date, race_type: "mountain_bike" },
        TODAY,
      ),
    ).toBe("taper");
    expect(
      currentPhase(
        { race_date: raceOffsetBy(15, "marathon", TODAY).race_date, race_type: "mountain_bike" },
        TODAY,
      ),
    ).toBe("pre_competition");
  });

  it("null race_type uses 'other_endurance' defaults", () => {
    expect(
      currentPhase(
        { race_date: raceOffsetBy(7, "marathon", TODAY).race_date, race_type: null },
        TODAY,
      ),
    ).toBe("race_week");
  });
});

describe("currentPhase — timezone insensitivity", () => {
  it("today and race on same calendar date in different TZ representations → race_week", () => {
    // Race date stored as YYYY-MM-DD with no time; today is mid-UTC-day.
    const race: PrimaryRaceLike = {
      race_date: "2026-05-17",
      race_type: "marathon",
    };
    expect(currentPhase(race, new Date("2026-05-17T00:00:01Z"))).toBe(
      "race_week",
    );
    expect(currentPhase(race, new Date("2026-05-17T23:59:59Z"))).toBe(
      "race_week",
    );
  });
});

describe("daysToRace helper", () => {
  it("returns null for null race", () => {
    expect(daysToRace(null, TODAY)).toBeNull();
  });

  it("returns null for unparseable race_date", () => {
    expect(daysToRace({ race_date: "bad", race_type: "marathon" }, TODAY)).toBeNull();
  });

  it("computes positive integer days for future race", () => {
    expect(daysToRace(raceOffsetBy(42, "marathon", TODAY), TODAY)).toBe(42);
  });

  it("computes negative integer days for past race", () => {
    expect(daysToRace(raceOffsetBy(-3, "marathon", TODAY), TODAY)).toBe(-3);
  });

  it("returns 0 on race day itself", () => {
    expect(daysToRace(raceOffsetBy(0, "marathon", TODAY), TODAY)).toBe(0);
  });
});
