/**
 * F15 — race-type-specific taper / race-week windows.
 *
 * The single source of truth for "how close to race day does taper start?"
 * Consumed by periodization.currentPhase() and exposed in /learn so athletes
 * can see why their phase changed.
 *
 * Why race-type-specific (and not a flat "3 weeks for everyone"):
 *   - Bosquet et al. (2007) meta found optimal taper is 14–21d for most events.
 *   - Mujika & Padilla (2003) and Mujika (2010) refined by distance: shorter
 *     events benefit from shorter tapers because the chronic-fatigue load is
 *     smaller; ultras need longer tapers because chronic load and recovery
 *     time scale up.
 *   - Knechtle & Nikolaidis (2018) documents the physiological recovery
 *     window for ultra-distance events specifically.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.8; PHASE-2.0-ARCHITECTURE.md §2.3 / §5.1.
 */

import type { CitationId } from "@/lib/data/citations";

/**
 * Race-type values mirror what `races.race_type` (T03) and `athletes.goal_race_type`
 * (legacy) accept. Anything outside this enum is mapped to "other_endurance"
 * defaults at lookup time.
 */
export type RaceType =
  | "marathon"
  | "half_marathon"
  | "10k"
  | "5k"
  | "ultramarathon"
  | "ironman_70_3"
  | "ironman_full"
  | "other_endurance";

export interface TaperBoundary {
  /** Days before race when taper phase begins. */
  taperDays: number;
  /** Days before race when race-week phase begins (also no-strength window). */
  raceWeekDays: number;
  /** Citations supporting this boundary, resolvable via lib/data/citations.ts. */
  citationIds: CitationId[];
}

const BOUNDARIES: Record<RaceType, TaperBoundary> = {
  ultramarathon: {
    taperDays: 28,
    raceWeekDays: 7,
    citationIds: ["knechtle_nikolaidis_2018", "bosquet_2007"],
  },
  ironman_full: {
    taperDays: 21,
    raceWeekDays: 7,
    citationIds: ["mujika_2010", "bosquet_2007"],
  },
  marathon: {
    taperDays: 21,
    raceWeekDays: 7,
    citationIds: ["bosquet_2007", "mujika_padilla_2003"],
  },
  ironman_70_3: {
    taperDays: 14,
    raceWeekDays: 7,
    citationIds: ["mujika_2010"],
  },
  half_marathon: {
    taperDays: 14,
    raceWeekDays: 7,
    citationIds: ["mujika_padilla_2003"],
  },
  "10k": {
    taperDays: 10,
    raceWeekDays: 5,
    citationIds: ["mujika_2010", "pyne_2009"],
  },
  "5k": {
    taperDays: 7,
    raceWeekDays: 4,
    citationIds: ["mujika_2010"],
  },
  other_endurance: {
    // Conservative default — matches half marathon's modest taper.
    taperDays: 14,
    raceWeekDays: 7,
    citationIds: ["bosquet_2007"],
  },
};

const ALL_RACE_TYPES: readonly RaceType[] = [
  "marathon",
  "half_marathon",
  "10k",
  "5k",
  "ultramarathon",
  "ironman_70_3",
  "ironman_full",
  "other_endurance",
];

export function taperBoundaryDays(raceType: string | null | undefined): TaperBoundary {
  if (raceType && (ALL_RACE_TYPES as readonly string[]).includes(raceType)) {
    return BOUNDARIES[raceType as RaceType];
  }
  return BOUNDARIES.other_endurance;
}

export function allRaceTypes(): readonly RaceType[] {
  return ALL_RACE_TYPES;
}

/**
 * Rows for rendering the boundary table in /learn. Exposed as data, not JSX,
 * so the page renderer owns presentation.
 */
export function taperBoundaryRows(): ReadonlyArray<{
  raceType: RaceType;
  label: string;
  taperDays: number;
  raceWeekDays: number;
  citationIds: CitationId[];
}> {
  const labels: Record<RaceType, string> = {
    ultramarathon: "Ultramarathon",
    ironman_full: "Ironman (full)",
    marathon: "Marathon",
    ironman_70_3: "Ironman 70.3",
    half_marathon: "Half marathon",
    "10k": "10K",
    "5k": "5K",
    other_endurance: "Other endurance / unknown",
  };
  // Render order: longest event first (longest taper first).
  const order: RaceType[] = [
    "ultramarathon",
    "ironman_full",
    "marathon",
    "ironman_70_3",
    "half_marathon",
    "10k",
    "5k",
    "other_endurance",
  ];
  return order.map((rt) => ({
    raceType: rt,
    label: labels[rt],
    taperDays: BOUNDARIES[rt].taperDays,
    raceWeekDays: BOUNDARIES[rt].raceWeekDays,
    citationIds: BOUNDARIES[rt].citationIds,
  }));
}
