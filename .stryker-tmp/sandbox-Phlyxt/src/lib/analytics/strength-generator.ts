/**
 * Strength v2 — pattern-driven menu generator.
 * Replaces the A/B/C template alternation model from Phase 1.
 *
 * The generator picks the correct emphasis tags for the week's primary
 * running pattern, then selects 4–6 exercises matching those tags,
 * staying under 50 min per day.
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { EXERCISES, getExercisesByEmphasis, type Exercise, type ExerciseEmphasis } from "@/lib/data/exercise-library";
import type { RunningPatternId } from "@/lib/analytics/runningPatterns";
import { citationToLink } from "@/lib/data/citations";
import type { CitationId } from "@/lib/data/citations";

// ── Scheduling helpers (unchanged from v1) ───────────────────────────────────

export interface RunForStrengthScheduling {
  sport_type: string;
  session_label: string | null;
  started_at: string;
}

/** Monday = 0 … Sunday = 6 */
export const WEEKDAY_NAMES_MON0 = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export function mondayBasedWeekday(startedAtIso: string): number {
  if (stryMutAct_9fa48("563")) {
    {}
  } else {
    stryCov_9fa48("563");
    const d = new Date(startedAtIso);
    const sun0 = d.getUTCDay();
    return stryMutAct_9fa48("564") ? (sun0 + 6) * 7 : (stryCov_9fa48("564"), (stryMutAct_9fa48("565") ? sun0 - 6 : (stryCov_9fa48("565"), sun0 + 6)) % 7);
  }
}
export function recommendStrengthDays(runsWeek: RunForStrengthScheduling[]): {
  recommendedDays: number[];
  avoidDays: number[];
  reason: string;
} {
  if (stryMutAct_9fa48("566")) {
    {}
  } else {
    stryCov_9fa48("566");
    const qualityRunDays: number[] = stryMutAct_9fa48("567") ? ["Stryker was here"] : (stryCov_9fa48("567"), []);
    const longRunDays: number[] = stryMutAct_9fa48("568") ? ["Stryker was here"] : (stryCov_9fa48("568"), []);
    for (const s of runsWeek) {
      if (stryMutAct_9fa48("569")) {
        {}
      } else {
        stryCov_9fa48("569");
        if (stryMutAct_9fa48("572") ? s.sport_type === "run" : stryMutAct_9fa48("571") ? false : stryMutAct_9fa48("570") ? true : (stryCov_9fa48("570", "571", "572"), s.sport_type !== (stryMutAct_9fa48("573") ? "" : (stryCov_9fa48("573"), "run")))) continue;
        const wd = mondayBasedWeekday(s.started_at);
        if (stryMutAct_9fa48("576") ? s.session_label === "interval" && s.session_label === "tempo" : stryMutAct_9fa48("575") ? false : stryMutAct_9fa48("574") ? true : (stryCov_9fa48("574", "575", "576"), (stryMutAct_9fa48("578") ? s.session_label !== "interval" : stryMutAct_9fa48("577") ? false : (stryCov_9fa48("577", "578"), s.session_label === (stryMutAct_9fa48("579") ? "" : (stryCov_9fa48("579"), "interval")))) || (stryMutAct_9fa48("581") ? s.session_label !== "tempo" : stryMutAct_9fa48("580") ? false : (stryCov_9fa48("580", "581"), s.session_label === (stryMutAct_9fa48("582") ? "" : (stryCov_9fa48("582"), "tempo")))))) {
          if (stryMutAct_9fa48("583")) {
            {}
          } else {
            stryCov_9fa48("583");
            qualityRunDays.push(wd);
          }
        }
        if (stryMutAct_9fa48("586") ? s.session_label !== "long_run" : stryMutAct_9fa48("585") ? false : stryMutAct_9fa48("584") ? true : (stryCov_9fa48("584", "585", "586"), s.session_label === (stryMutAct_9fa48("587") ? "" : (stryCov_9fa48("587"), "long_run")))) {
          if (stryMutAct_9fa48("588")) {
            {}
          } else {
            stryCov_9fa48("588");
            longRunDays.push(wd);
          }
        }
      }
    }
    const blocked = new Set<number>();
    for (const qd of qualityRunDays) blocked.add(stryMutAct_9fa48("589") ? (qd + 6) * 7 : (stryCov_9fa48("589"), (stryMutAct_9fa48("590") ? qd - 6 : (stryCov_9fa48("590"), qd + 6)) % 7));
    for (const ld of longRunDays) blocked.add(stryMutAct_9fa48("591") ? (ld + 6) * 7 : (stryCov_9fa48("591"), (stryMutAct_9fa48("592") ? ld - 6 : (stryCov_9fa48("592"), ld + 6)) % 7));
    const available: number[] = stryMutAct_9fa48("593") ? ["Stryker was here"] : (stryCov_9fa48("593"), []);
    for (let d = 0; stryMutAct_9fa48("596") ? d >= 7 : stryMutAct_9fa48("595") ? d <= 7 : stryMutAct_9fa48("594") ? false : (stryCov_9fa48("594", "595", "596"), d < 7); stryMutAct_9fa48("597") ? d -= 1 : (stryCov_9fa48("597"), d += 1)) {
      if (stryMutAct_9fa48("598")) {
        {}
      } else {
        stryCov_9fa48("598");
        if (stryMutAct_9fa48("601") ? false : stryMutAct_9fa48("600") ? true : stryMutAct_9fa48("599") ? blocked.has(d) : (stryCov_9fa48("599", "600", "601"), !blocked.has(d))) available.push(d);
      }
    }
    return stryMutAct_9fa48("602") ? {} : (stryCov_9fa48("602"), {
      recommendedDays: stryMutAct_9fa48("603") ? available : (stryCov_9fa48("603"), available.slice(0, 2)),
      avoidDays: stryMutAct_9fa48("604") ? [...blocked] : (stryCov_9fa48("604"), (stryMutAct_9fa48("605") ? [] : (stryCov_9fa48("605"), [...blocked])).sort(stryMutAct_9fa48("606") ? () => undefined : (stryCov_9fa48("606"), (a, b) => stryMutAct_9fa48("607") ? a + b : (stryCov_9fa48("607"), a - b)))),
      reason: stryMutAct_9fa48("608") ? "" : (stryCov_9fa48("608"), "Placed after quality runs or on easy days. Strength immediately before a hard or long run can blunt performance for several hours (Fyfe et al., 2014).")
    });
  }
}

// ── Pattern → menu config ────────────────────────────────────────────────────

interface PatternConfig {
  primaryEmphasis: ExerciseEmphasis[];
  maxDays: number;
  targetDurationMin: number; // target per day
  maxDurationMin: number; // hard cap per day
  minExercises: number;
  maxExercises: number;
  rationaleSuffix: string;
  citationIds: CitationId[];
}
const PATTERN_CONFIG: Record<RunningPatternId, PatternConfig> = stryMutAct_9fa48("609") ? {} : (stryCov_9fa48("609"), {
  interference_safe: stryMutAct_9fa48("610") ? {} : (stryCov_9fa48("610"), {
    primaryEmphasis: stryMutAct_9fa48("611") ? [] : (stryCov_9fa48("611"), [stryMutAct_9fa48("612") ? "" : (stryCov_9fa48("612"), "mobility")]),
    maxDays: 1,
    targetDurationMin: 20,
    maxDurationMin: 25,
    minExercises: 4,
    maxExercises: 5,
    rationaleSuffix: stryMutAct_9fa48("613") ? "" : (stryCov_9fa48("613"), "Recovery-style mobility only — a high-severity interference window fired this week. No heavy loading."),
    citationIds: stryMutAct_9fa48("614") ? [] : (stryCov_9fa48("614"), [stryMutAct_9fa48("615") ? "" : (stryCov_9fa48("615"), "fyfe_2014"), stryMutAct_9fa48("616") ? "" : (stryCov_9fa48("616"), "wilson_2012")])
  }),
  taper_or_high_load: stryMutAct_9fa48("617") ? {} : (stryCov_9fa48("617"), {
    primaryEmphasis: stryMutAct_9fa48("618") ? [] : (stryCov_9fa48("618"), [stryMutAct_9fa48("619") ? "" : (stryCov_9fa48("619"), "maintenance")]),
    maxDays: 1,
    targetDurationMin: 25,
    maxDurationMin: 30,
    minExercises: 4,
    maxExercises: 5,
    rationaleSuffix: stryMutAct_9fa48("620") ? "" : (stryCov_9fa48("620"), "Maintenance volume only — training load is elevated or race is within 3 weeks."),
    citationIds: stryMutAct_9fa48("621") ? [] : (stryCov_9fa48("621"), [stryMutAct_9fa48("622") ? "" : (stryCov_9fa48("622"), "mujika_2010")])
  }),
  low_cadence_intervals: stryMutAct_9fa48("623") ? {} : (stryCov_9fa48("623"), {
    primaryEmphasis: stryMutAct_9fa48("624") ? [] : (stryCov_9fa48("624"), [stryMutAct_9fa48("625") ? "" : (stryCov_9fa48("625"), "plyometric"), stryMutAct_9fa48("626") ? "" : (stryCov_9fa48("626"), "single_leg_economy")]),
    maxDays: 1,
    targetDurationMin: 40,
    maxDurationMin: 45,
    minExercises: 4,
    maxExercises: 6,
    rationaleSuffix: stryMutAct_9fa48("627") ? "" : (stryCov_9fa48("627"), "Plyometric and single-leg work to improve ground contact time and cadence."),
    citationIds: stryMutAct_9fa48("628") ? [] : (stryCov_9fa48("628"), [stryMutAct_9fa48("629") ? "" : (stryCov_9fa48("629"), "saunders_2006"), stryMutAct_9fa48("630") ? "" : (stryCov_9fa48("630"), "blagrove_2018")])
  }),
  long_run_drift: stryMutAct_9fa48("631") ? {} : (stryCov_9fa48("631"), {
    primaryEmphasis: stryMutAct_9fa48("632") ? [] : (stryCov_9fa48("632"), [stryMutAct_9fa48("633") ? "" : (stryCov_9fa48("633"), "posterior_chain"), stryMutAct_9fa48("634") ? "" : (stryCov_9fa48("634"), "core_stability")]),
    maxDays: 1,
    targetDurationMin: 40,
    maxDurationMin: 50,
    minExercises: 4,
    maxExercises: 6,
    rationaleSuffix: stryMutAct_9fa48("635") ? "" : (stryCov_9fa48("635"), "Posterior chain and core work for late-race fatigue resistance — long run HR drift detected."),
    citationIds: stryMutAct_9fa48("636") ? [] : (stryCov_9fa48("636"), [stryMutAct_9fa48("637") ? "" : (stryCov_9fa48("637"), "bourne_2017"), stryMutAct_9fa48("638") ? "" : (stryCov_9fa48("638"), "blagrove_2018")])
  }),
  low_easy_load_share: stryMutAct_9fa48("639") ? {} : (stryCov_9fa48("639"), {
    primaryEmphasis: stryMutAct_9fa48("640") ? [] : (stryCov_9fa48("640"), [stryMutAct_9fa48("641") ? "" : (stryCov_9fa48("641"), "single_leg_economy"), stryMutAct_9fa48("642") ? "" : (stryCov_9fa48("642"), "posterior_chain")]),
    maxDays: 2,
    targetDurationMin: 40,
    maxDurationMin: 50,
    minExercises: 4,
    maxExercises: 6,
    rationaleSuffix: stryMutAct_9fa48("643") ? "" : (stryCov_9fa48("643"), "Single-leg economy and posterior chain work. Better running economy makes easy pace sustainable at lower HR, which shifts load share toward Zone 1–2."),
    citationIds: stryMutAct_9fa48("644") ? [] : (stryCov_9fa48("644"), [stryMutAct_9fa48("645") ? "" : (stryCov_9fa48("645"), "beattie_2017"), stryMutAct_9fa48("646") ? "" : (stryCov_9fa48("646"), "blagrove_2018")])
  }),
  default: stryMutAct_9fa48("647") ? {} : (stryCov_9fa48("647"), {
    primaryEmphasis: stryMutAct_9fa48("648") ? [] : (stryCov_9fa48("648"), [stryMutAct_9fa48("649") ? "" : (stryCov_9fa48("649"), "single_leg_economy"), stryMutAct_9fa48("650") ? "" : (stryCov_9fa48("650"), "posterior_chain"), stryMutAct_9fa48("651") ? "" : (stryCov_9fa48("651"), "core_stability")]),
    maxDays: 1,
    targetDurationMin: 45,
    maxDurationMin: 50,
    minExercises: 4,
    maxExercises: 6,
    rationaleSuffix: stryMutAct_9fa48("652") ? "" : (stryCov_9fa48("652"), "General lower-body strength and core. No specific running weakness pattern detected this week."),
    citationIds: stryMutAct_9fa48("653") ? [] : (stryCov_9fa48("653"), [stryMutAct_9fa48("654") ? "" : (stryCov_9fa48("654"), "beattie_2017"), stryMutAct_9fa48("655") ? "" : (stryCov_9fa48("655"), "blagrove_2018")])
  })
});

// ── Menu builder ─────────────────────────────────────────────────────────────

/** Estimate exercise duration in minutes (sets × (work + rest)). */
function estimateExerciseDurationMin(ex: Exercise): number {
  if (stryMutAct_9fa48("656")) {
    {}
  } else {
    stryCov_9fa48("656");
    // parse "3 × 6–8" → sets = 3
    const setsMatch = ex.sets_reps.match(stryMutAct_9fa48("659") ? /^(\D+)/ : stryMutAct_9fa48("658") ? /^(\d)/ : stryMutAct_9fa48("657") ? /(\d+)/ : (stryCov_9fa48("657", "658", "659"), /^(\d+)/));
    const sets = setsMatch ? Number(setsMatch[1]) : 3;
    const restMin = stryMutAct_9fa48("660") ? ex.rest_seconds * 60 : (stryCov_9fa48("660"), ex.rest_seconds / 60);
    const workMin = 0.75; // ~45s per set for most exercises
    return stryMutAct_9fa48("661") ? sets / (workMin + restMin) : (stryCov_9fa48("661"), sets * (stryMutAct_9fa48("662") ? workMin - restMin : (stryCov_9fa48("662"), workMin + restMin)));
  }
}

/** Select up to maxCount exercises matching the emphasis tags within the duration budget. */
function selectExercises(tags: ExerciseEmphasis[], minCount: number, maxCount: number, maxDurationMin: number): Exercise[] {
  if (stryMutAct_9fa48("663")) {
    {}
  } else {
    stryCov_9fa48("663");
    const pool = getExercisesByEmphasis(tags);
    const selected: Exercise[] = stryMutAct_9fa48("664") ? ["Stryker was here"] : (stryCov_9fa48("664"), []);
    let totalMin = 0;

    // Prefer variety: avoid duplicating the same primary emphasis back-to-back
    for (const ex of pool) {
      if (stryMutAct_9fa48("665")) {
        {}
      } else {
        stryCov_9fa48("665");
        if (stryMutAct_9fa48("669") ? selected.length < maxCount : stryMutAct_9fa48("668") ? selected.length > maxCount : stryMutAct_9fa48("667") ? false : stryMutAct_9fa48("666") ? true : (stryCov_9fa48("666", "667", "668", "669"), selected.length >= maxCount)) break;
        const dur = estimateExerciseDurationMin(ex);
        if (stryMutAct_9fa48("672") ? totalMin + dur > maxDurationMin || selected.length >= minCount : stryMutAct_9fa48("671") ? false : stryMutAct_9fa48("670") ? true : (stryCov_9fa48("670", "671", "672"), (stryMutAct_9fa48("675") ? totalMin + dur <= maxDurationMin : stryMutAct_9fa48("674") ? totalMin + dur >= maxDurationMin : stryMutAct_9fa48("673") ? true : (stryCov_9fa48("673", "674", "675"), (stryMutAct_9fa48("676") ? totalMin - dur : (stryCov_9fa48("676"), totalMin + dur)) > maxDurationMin)) && (stryMutAct_9fa48("679") ? selected.length < minCount : stryMutAct_9fa48("678") ? selected.length > minCount : stryMutAct_9fa48("677") ? true : (stryCov_9fa48("677", "678", "679"), selected.length >= minCount)))) break;
        selected.push(ex);
        stryMutAct_9fa48("680") ? totalMin -= dur : (stryCov_9fa48("680"), totalMin += dur);
      }
    }
    return selected;
  }
}
function formatDayList(days: number[]): string {
  if (stryMutAct_9fa48("681")) {
    {}
  } else {
    stryCov_9fa48("681");
    const names = days.map(stryMutAct_9fa48("682") ? () => undefined : (stryCov_9fa48("682"), d => WEEKDAY_NAMES_MON0[d]));
    if (stryMutAct_9fa48("685") ? names.length !== 0 : stryMutAct_9fa48("684") ? false : stryMutAct_9fa48("683") ? true : (stryCov_9fa48("683", "684", "685"), names.length === 0)) return stryMutAct_9fa48("686") ? "Stryker was here!" : (stryCov_9fa48("686"), "");
    if (stryMutAct_9fa48("689") ? names.length !== 1 : stryMutAct_9fa48("688") ? false : stryMutAct_9fa48("687") ? true : (stryCov_9fa48("687", "688", "689"), names.length === 1)) return names[0];
    if (stryMutAct_9fa48("692") ? names.length !== 2 : stryMutAct_9fa48("691") ? false : stryMutAct_9fa48("690") ? true : (stryCov_9fa48("690", "691", "692"), names.length === 2)) return stryMutAct_9fa48("693") ? `` : (stryCov_9fa48("693"), `${names[0]} or ${names[1]}`);
    return stryMutAct_9fa48("694") ? `` : (stryCov_9fa48("694"), `${stryMutAct_9fa48("695") ? names.join(", ") : (stryCov_9fa48("695"), names.slice(0, stryMutAct_9fa48("696") ? +1 : (stryCov_9fa48("696"), -1)).join(stryMutAct_9fa48("697") ? "" : (stryCov_9fa48("697"), ", ")))}, or ${names[stryMutAct_9fa48("698") ? names.length + 1 : (stryCov_9fa48("698"), names.length - 1)]}`);
  }
}

// ── New public interfaces ────────────────────────────────────────────────────

export interface StrengthMenuDay {
  weekday: number; // 0 = Monday
  duration_min: number;
  exercises: Exercise[];
}
export interface StrengthMenuModel {
  pattern: RunningPatternId;
  days: StrengthMenuDay[];
  rationale: string;
  schedulingSummary: string;
  citations: Array<{
    label: string;
    href: string;
  }>;
}

/** Persisted JSON shape for `weekly_analyses.strength_recommendation`. */
export interface StrengthRecommendationRecord {
  pattern: RunningPatternId;
  days: Array<{
    weekday: number;
    duration_min: number;
    exercise_ids: string[];
  }>;
  rationale: string;
  scheduling_summary: string;
  citations: Array<{
    label: string;
    href: string;
  }>;
}

// Keep this alias so report model types still compile
export type StrengthRecommendationModel = StrengthMenuModel;
export function buildStrengthMenu(input: {
  primaryPattern: RunningPatternId;
  runsWeek: RunForStrengthScheduling[];
  loadStatusWord: string;
  loadRatio: number | null;
  raceDateIso: string | null | undefined;
  referenceMs: number;
}): StrengthMenuModel {
  if (stryMutAct_9fa48("699")) {
    {}
  } else {
    stryCov_9fa48("699");
    const {
      primaryPattern,
      runsWeek,
      loadStatusWord,
      loadRatio,
      raceDateIso
    } = input;
    const config = PATTERN_CONFIG[primaryPattern];
    const {
      recommendedDays,
      avoidDays,
      reason
    } = recommendStrengthDays(runsWeek);
    const selectedExercises = selectExercises(config.primaryEmphasis, config.minExercises, config.maxExercises, config.maxDurationMin);
    const totalDurationMin = selectedExercises.reduce(stryMutAct_9fa48("700") ? () => undefined : (stryCov_9fa48("700"), (s, e) => stryMutAct_9fa48("701") ? s - estimateExerciseDurationMin(e) : (stryCov_9fa48("701"), s + estimateExerciseDurationMin(e))), 0);

    // Decide number of days: split into 2 when volume or exercise count warrants
    const numDays = (stryMutAct_9fa48("704") ? config.maxDays >= 2 || totalDurationMin > 50 || selectedExercises.length > 6 : stryMutAct_9fa48("703") ? false : stryMutAct_9fa48("702") ? true : (stryCov_9fa48("702", "703", "704"), (stryMutAct_9fa48("707") ? config.maxDays < 2 : stryMutAct_9fa48("706") ? config.maxDays > 2 : stryMutAct_9fa48("705") ? true : (stryCov_9fa48("705", "706", "707"), config.maxDays >= 2)) && (stryMutAct_9fa48("709") ? totalDurationMin > 50 && selectedExercises.length > 6 : stryMutAct_9fa48("708") ? true : (stryCov_9fa48("708", "709"), (stryMutAct_9fa48("712") ? totalDurationMin <= 50 : stryMutAct_9fa48("711") ? totalDurationMin >= 50 : stryMutAct_9fa48("710") ? false : (stryCov_9fa48("710", "711", "712"), totalDurationMin > 50)) || (stryMutAct_9fa48("715") ? selectedExercises.length <= 6 : stryMutAct_9fa48("714") ? selectedExercises.length >= 6 : stryMutAct_9fa48("713") ? false : (stryCov_9fa48("713", "714", "715"), selectedExercises.length > 6)))))) ? 2 : 1;
    const daySlots = stryMutAct_9fa48("716") ? recommendedDays : (stryCov_9fa48("716"), recommendedDays.slice(0, numDays));
    const perDayExercises = (stryMutAct_9fa48("719") ? numDays !== 2 : stryMutAct_9fa48("718") ? false : stryMutAct_9fa48("717") ? true : (stryCov_9fa48("717", "718", "719"), numDays === 2)) ? stryMutAct_9fa48("720") ? [] : (stryCov_9fa48("720"), [stryMutAct_9fa48("721") ? selectedExercises : (stryCov_9fa48("721"), selectedExercises.slice(0, Math.ceil(stryMutAct_9fa48("722") ? selectedExercises.length * 2 : (stryCov_9fa48("722"), selectedExercises.length / 2)))), stryMutAct_9fa48("723") ? selectedExercises : (stryCov_9fa48("723"), selectedExercises.slice(Math.ceil(stryMutAct_9fa48("724") ? selectedExercises.length * 2 : (stryCov_9fa48("724"), selectedExercises.length / 2))))]) : stryMutAct_9fa48("725") ? [] : (stryCov_9fa48("725"), [selectedExercises]);
    const days: StrengthMenuDay[] = daySlots.map((wd, i) => {
      if (stryMutAct_9fa48("726")) {
        {}
      } else {
        stryCov_9fa48("726");
        const exs = stryMutAct_9fa48("727") ? perDayExercises[i] && selectedExercises : (stryCov_9fa48("727"), perDayExercises[i] ?? selectedExercises);
        return stryMutAct_9fa48("728") ? {} : (stryCov_9fa48("728"), {
          weekday: wd,
          duration_min: Math.round(exs.reduce(stryMutAct_9fa48("729") ? () => undefined : (stryCov_9fa48("729"), (s, e) => stryMutAct_9fa48("730") ? s - estimateExerciseDurationMin(e) : (stryCov_9fa48("730"), s + estimateExerciseDurationMin(e))), 0)),
          exercises: exs
        });
      }
    });

    // Rationale
    const loadBit = (stryMutAct_9fa48("733") ? loadRatio == null : stryMutAct_9fa48("732") ? false : stryMutAct_9fa48("731") ? true : (stryCov_9fa48("731", "732", "733"), loadRatio != null)) ? stryMutAct_9fa48("734") ? `` : (stryCov_9fa48("734"), `Load ratio is ${loadRatio.toFixed(2)} (${stryMutAct_9fa48("735") ? loadStatusWord.toUpperCase() : (stryCov_9fa48("735"), loadStatusWord.toLowerCase())}).`) : stryMutAct_9fa48("736") ? "" : (stryCov_9fa48("736"), "Load baseline is still establishing.");
    const rationale = stryMutAct_9fa48("737") ? `` : (stryCov_9fa48("737"), `${loadBit} ${config.rationaleSuffix}`);

    // Scheduling summary
    const avoidText = (stryMutAct_9fa48("741") ? avoidDays.length <= 0 : stryMutAct_9fa48("740") ? avoidDays.length >= 0 : stryMutAct_9fa48("739") ? false : stryMutAct_9fa48("738") ? true : (stryCov_9fa48("738", "739", "740", "741"), avoidDays.length > 0)) ? stryMutAct_9fa48("742") ? `` : (stryCov_9fa48("742"), `Avoid ${formatDayList(avoidDays)} — day before quality or long runs.`) : stryMutAct_9fa48("743") ? "Stryker was here!" : (stryCov_9fa48("743"), "");
    const schedulingSummary = (stryMutAct_9fa48("747") ? daySlots.length <= 0 : stryMutAct_9fa48("746") ? daySlots.length >= 0 : stryMutAct_9fa48("745") ? false : stryMutAct_9fa48("744") ? true : (stryCov_9fa48("744", "745", "746", "747"), daySlots.length > 0)) ? stryMutAct_9fa48("748") ? `${formatDayList(daySlots)} — after quality runs, not before. ${avoidText}` : (stryCov_9fa48("748"), (stryMutAct_9fa48("749") ? `` : (stryCov_9fa48("749"), `${formatDayList(daySlots)} — after quality runs, not before. ${avoidText}`)).trim()) : stryMutAct_9fa48("750") ? `No clear strength days this week — choose any easy day. ${avoidText}` : (stryCov_9fa48("750"), (stryMutAct_9fa48("751") ? `` : (stryCov_9fa48("751"), `No clear strength days this week — choose any easy day. ${avoidText}`)).trim());
    const citations = config.citationIds.map(stryMutAct_9fa48("752") ? () => undefined : (stryCov_9fa48("752"), id => citationToLink(id)));
    const record: StrengthRecommendationRecord = stryMutAct_9fa48("753") ? {} : (stryCov_9fa48("753"), {
      pattern: primaryPattern,
      days: days.map(stryMutAct_9fa48("754") ? () => undefined : (stryCov_9fa48("754"), d => stryMutAct_9fa48("755") ? {} : (stryCov_9fa48("755"), {
        weekday: d.weekday,
        duration_min: d.duration_min,
        exercise_ids: d.exercises.map(stryMutAct_9fa48("756") ? () => undefined : (stryCov_9fa48("756"), e => e.id))
      }))),
      rationale,
      scheduling_summary: schedulingSummary,
      citations
    });
    return {
      pattern: primaryPattern,
      days,
      rationale,
      schedulingSummary,
      citations,
      // attach record for persistence
      ...{
        record
      }
    } as StrengthMenuModel & {
      record: StrengthRecommendationRecord;
    };
  }
}

// Backwards-compatible wrapper (used by computeWeeklyReportPayload)
export function buildStrengthRecommendation(input: {
  runsWeek: RunForStrengthScheduling[];
  loadRatio: number | null;
  loadStatusWord: string;
  raceDateIso: string | null | undefined;
  referenceMs: number;
  primaryPattern?: RunningPatternId;
}): StrengthMenuModel & {
  record: StrengthRecommendationRecord;
} {
  if (stryMutAct_9fa48("757")) {
    {}
  } else {
    stryCov_9fa48("757");
    const pattern = stryMutAct_9fa48("758") ? input.primaryPattern && "default" : (stryCov_9fa48("758"), input.primaryPattern ?? (stryMutAct_9fa48("759") ? "" : (stryCov_9fa48("759"), "default")));
    return buildStrengthMenu({
      primaryPattern: pattern,
      runsWeek: input.runsWeek,
      loadStatusWord: input.loadStatusWord,
      loadRatio: input.loadRatio,
      raceDateIso: input.raceDateIso,
      referenceMs: input.referenceMs
    }) as StrengthMenuModel & {
      record: StrengthRecommendationRecord;
    };
  }
}

/** Parse a persisted JSON record back into a StrengthMenuModel for display. */
export function parseStrengthRecord(raw: unknown): StrengthRecommendationRecord | null {
  if (stryMutAct_9fa48("760")) {
    {}
  } else {
    stryCov_9fa48("760");
    if (stryMutAct_9fa48("763") ? raw == null && typeof raw !== "object" : stryMutAct_9fa48("762") ? false : stryMutAct_9fa48("761") ? true : (stryCov_9fa48("761", "762", "763"), (stryMutAct_9fa48("765") ? raw != null : stryMutAct_9fa48("764") ? false : (stryCov_9fa48("764", "765"), raw == null)) || (stryMutAct_9fa48("767") ? typeof raw === "object" : stryMutAct_9fa48("766") ? false : (stryCov_9fa48("766", "767"), typeof raw !== (stryMutAct_9fa48("768") ? "" : (stryCov_9fa48("768"), "object")))))) return null;
    const r = raw as Record<string, unknown>;
    if (stryMutAct_9fa48("771") ? typeof r.pattern === "string" : stryMutAct_9fa48("770") ? false : stryMutAct_9fa48("769") ? true : (stryCov_9fa48("769", "770", "771"), typeof r.pattern !== (stryMutAct_9fa48("772") ? "" : (stryCov_9fa48("772"), "string")))) return null;
    return r as unknown as StrengthRecommendationRecord;
  }
}

/** Reconstruct a display model from a persisted record (for cached report loads). */
export function modelFromStrengthRecord(record: StrengthRecommendationRecord): StrengthMenuModel {
  if (stryMutAct_9fa48("773")) {
    {}
  } else {
    stryCov_9fa48("773");
    const days: StrengthMenuDay[] = record.days.map(d => {
      if (stryMutAct_9fa48("774")) {
        {}
      } else {
        stryCov_9fa48("774");
        const exercises = stryMutAct_9fa48("775") ? d.exercise_ids.map(id => EXERCISES.find(e => e.id === id)) : (stryCov_9fa48("775"), d.exercise_ids.map(stryMutAct_9fa48("776") ? () => undefined : (stryCov_9fa48("776"), id => EXERCISES.find(stryMutAct_9fa48("777") ? () => undefined : (stryCov_9fa48("777"), e => stryMutAct_9fa48("780") ? e.id !== id : stryMutAct_9fa48("779") ? false : stryMutAct_9fa48("778") ? true : (stryCov_9fa48("778", "779", "780"), e.id === id))))).filter(stryMutAct_9fa48("781") ? () => undefined : (stryCov_9fa48("781"), (e): e is Exercise => stryMutAct_9fa48("784") ? e == null : stryMutAct_9fa48("783") ? false : stryMutAct_9fa48("782") ? true : (stryCov_9fa48("782", "783", "784"), e != null))));
        return stryMutAct_9fa48("785") ? {} : (stryCov_9fa48("785"), {
          weekday: d.weekday,
          duration_min: d.duration_min,
          exercises
        });
      }
    });
    return stryMutAct_9fa48("786") ? {} : (stryCov_9fa48("786"), {
      pattern: record.pattern as RunningPatternId,
      days,
      rationale: record.rationale,
      schedulingSummary: record.scheduling_summary,
      citations: record.citations
    });
  }
}