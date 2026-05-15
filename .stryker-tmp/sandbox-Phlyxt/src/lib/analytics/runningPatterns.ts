/**
 * Running pattern detector for Strength v2 focus engine.
 *
 * Each detector is independent. Multiple patterns can fire simultaneously;
 * the focus engine picks the highest-priority one (lowest array index).
 *
 * Priority order (high → low):
 *   1. interference_safe     — Rule 6 fired High this week
 *   2. taper_or_high_load    — load spike or race within 3 weeks
 *   3. low_cadence_intervals — avg_cadence < 168 on intervals
 *   4. long_run_drift        — HR drift in final third (requires per-segment data; no-ops without it)
 *   5. low_easy_load_share   — pct_load_z1_2 < 60% (uses intensity v2 shadow)
 *   6. default               — fallback when nothing else fires
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
import type { WeeklyReportModel } from "@/lib/report/model";
import type { IntensityV2Breakdown } from "@/lib/analytics/intensityV2";
export type RunningPatternId = "interference_safe" | "taper_or_high_load" | "low_cadence_intervals" | "long_run_drift" | "low_easy_load_share" | "default";
export interface WorkoutForPatterns {
  sport_type: string;
  session_label: string | null;
  started_at: string;
  avg_cadence: number | null;
  avg_hr: number | null;
}
export interface LoadMetricsForPatterns {
  loadRatio: number | null;
}
export function detectRunningPatterns(input: {
  weekWorkouts: WorkoutForPatterns[];
  load: LoadMetricsForPatterns;
  intensityV2: IntensityV2Breakdown | null;
  raceDateIso: string | null;
  referenceMs: number;
  findings: WeeklyReportModel["findings"];
}): {
  primary: RunningPatternId;
  all: RunningPatternId[];
} {
  if (stryMutAct_9fa48("474")) {
    {}
  } else {
    stryCov_9fa48("474");
    const {
      weekWorkouts,
      load,
      intensityV2,
      raceDateIso,
      referenceMs,
      findings
    } = input;
    const detected: RunningPatternId[] = stryMutAct_9fa48("475") ? ["Stryker was here"] : (stryCov_9fa48("475"), []);

    // Pattern 1: interference_safe
    // Rule 6 fired with High severity this week → recovery-style only
    const hasHighInterference = stryMutAct_9fa48("476") ? findings.every(f => f.severity === "High" && /interference|strength\s+close/i.test(f.title)) : (stryCov_9fa48("476"), findings.some(stryMutAct_9fa48("477") ? () => undefined : (stryCov_9fa48("477"), f => stryMutAct_9fa48("480") ? f.severity === "High" || /interference|strength\s+close/i.test(f.title) : stryMutAct_9fa48("479") ? false : stryMutAct_9fa48("478") ? true : (stryCov_9fa48("478", "479", "480"), (stryMutAct_9fa48("482") ? f.severity !== "High" : stryMutAct_9fa48("481") ? true : (stryCov_9fa48("481", "482"), f.severity === (stryMutAct_9fa48("483") ? "" : (stryCov_9fa48("483"), "High")))) && (stryMutAct_9fa48("485") ? /interference|strength\S+close/i : stryMutAct_9fa48("484") ? /interference|strength\sclose/i : (stryCov_9fa48("484", "485"), /interference|strength\s+close/i)).test(f.title)))));
    if (stryMutAct_9fa48("487") ? false : stryMutAct_9fa48("486") ? true : (stryCov_9fa48("486", "487"), hasHighInterference)) detected.push(stryMutAct_9fa48("488") ? "" : (stryCov_9fa48("488"), "interference_safe"));

    // Pattern 2: taper_or_high_load
    // loadRatio > 1.3 OR race within 3 weeks
    const weeksToRace = (stryMutAct_9fa48("491") ? raceDateIso || /^\d{4}-\d{2}-\d{2}/.test(raceDateIso) : stryMutAct_9fa48("490") ? false : stryMutAct_9fa48("489") ? true : (stryCov_9fa48("489", "490", "491"), raceDateIso && (stryMutAct_9fa48("498") ? /^\d{4}-\d{2}-\D{2}/ : stryMutAct_9fa48("497") ? /^\d{4}-\d{2}-\d/ : stryMutAct_9fa48("496") ? /^\d{4}-\D{2}-\d{2}/ : stryMutAct_9fa48("495") ? /^\d{4}-\d-\d{2}/ : stryMutAct_9fa48("494") ? /^\D{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("493") ? /^\d-\d{2}-\d{2}/ : stryMutAct_9fa48("492") ? /\d{4}-\d{2}-\d{2}/ : (stryCov_9fa48("492", "493", "494", "495", "496", "497", "498"), /^\d{4}-\d{2}-\d{2}/)).test(raceDateIso))) ? Math.floor(stryMutAct_9fa48("499") ? (Date.parse(raceDateIso + "T23:59:59Z") - referenceMs) * (7 * 86400000) : (stryCov_9fa48("499"), (stryMutAct_9fa48("500") ? Date.parse(raceDateIso + "T23:59:59Z") + referenceMs : (stryCov_9fa48("500"), Date.parse(raceDateIso + (stryMutAct_9fa48("501") ? "" : (stryCov_9fa48("501"), "T23:59:59Z"))) - referenceMs)) / (stryMutAct_9fa48("502") ? 7 / 86400000 : (stryCov_9fa48("502"), 7 * 86400000)))) : null;
    const isHighLoad = stryMutAct_9fa48("505") ? load.loadRatio != null || load.loadRatio > 1.3 : stryMutAct_9fa48("504") ? false : stryMutAct_9fa48("503") ? true : (stryCov_9fa48("503", "504", "505"), (stryMutAct_9fa48("507") ? load.loadRatio == null : stryMutAct_9fa48("506") ? true : (stryCov_9fa48("506", "507"), load.loadRatio != null)) && (stryMutAct_9fa48("510") ? load.loadRatio <= 1.3 : stryMutAct_9fa48("509") ? load.loadRatio >= 1.3 : stryMutAct_9fa48("508") ? true : (stryCov_9fa48("508", "509", "510"), load.loadRatio > 1.3)));
    const isTaper = stryMutAct_9fa48("513") ? weeksToRace != null && weeksToRace >= 0 || weeksToRace <= 3 : stryMutAct_9fa48("512") ? false : stryMutAct_9fa48("511") ? true : (stryCov_9fa48("511", "512", "513"), (stryMutAct_9fa48("515") ? weeksToRace != null || weeksToRace >= 0 : stryMutAct_9fa48("514") ? true : (stryCov_9fa48("514", "515"), (stryMutAct_9fa48("517") ? weeksToRace == null : stryMutAct_9fa48("516") ? true : (stryCov_9fa48("516", "517"), weeksToRace != null)) && (stryMutAct_9fa48("520") ? weeksToRace < 0 : stryMutAct_9fa48("519") ? weeksToRace > 0 : stryMutAct_9fa48("518") ? true : (stryCov_9fa48("518", "519", "520"), weeksToRace >= 0)))) && (stryMutAct_9fa48("523") ? weeksToRace > 3 : stryMutAct_9fa48("522") ? weeksToRace < 3 : stryMutAct_9fa48("521") ? true : (stryCov_9fa48("521", "522", "523"), weeksToRace <= 3)));
    if (stryMutAct_9fa48("526") ? isHighLoad && isTaper : stryMutAct_9fa48("525") ? false : stryMutAct_9fa48("524") ? true : (stryCov_9fa48("524", "525", "526"), isHighLoad || isTaper)) detected.push(stryMutAct_9fa48("527") ? "" : (stryCov_9fa48("527"), "taper_or_high_load"));

    // Pattern 3: low_cadence_intervals
    // At least one interval session with avg_cadence < 168 spm
    const hasLowCadenceInterval = stryMutAct_9fa48("528") ? weekWorkouts.every(w => w.sport_type === "run" && w.session_label === "interval" && w.avg_cadence != null && w.avg_cadence < 168) : (stryCov_9fa48("528"), weekWorkouts.some(stryMutAct_9fa48("529") ? () => undefined : (stryCov_9fa48("529"), w => stryMutAct_9fa48("532") ? w.sport_type === "run" && w.session_label === "interval" && w.avg_cadence != null || w.avg_cadence < 168 : stryMutAct_9fa48("531") ? false : stryMutAct_9fa48("530") ? true : (stryCov_9fa48("530", "531", "532"), (stryMutAct_9fa48("534") ? w.sport_type === "run" && w.session_label === "interval" || w.avg_cadence != null : stryMutAct_9fa48("533") ? true : (stryCov_9fa48("533", "534"), (stryMutAct_9fa48("536") ? w.sport_type === "run" || w.session_label === "interval" : stryMutAct_9fa48("535") ? true : (stryCov_9fa48("535", "536"), (stryMutAct_9fa48("538") ? w.sport_type !== "run" : stryMutAct_9fa48("537") ? true : (stryCov_9fa48("537", "538"), w.sport_type === (stryMutAct_9fa48("539") ? "" : (stryCov_9fa48("539"), "run")))) && (stryMutAct_9fa48("541") ? w.session_label !== "interval" : stryMutAct_9fa48("540") ? true : (stryCov_9fa48("540", "541"), w.session_label === (stryMutAct_9fa48("542") ? "" : (stryCov_9fa48("542"), "interval")))))) && (stryMutAct_9fa48("544") ? w.avg_cadence == null : stryMutAct_9fa48("543") ? true : (stryCov_9fa48("543", "544"), w.avg_cadence != null)))) && (stryMutAct_9fa48("547") ? w.avg_cadence >= 168 : stryMutAct_9fa48("546") ? w.avg_cadence <= 168 : stryMutAct_9fa48("545") ? true : (stryCov_9fa48("545", "546", "547"), w.avg_cadence < 168))))));
    if (stryMutAct_9fa48("549") ? false : stryMutAct_9fa48("548") ? true : (stryCov_9fa48("548", "549"), hasLowCadenceInterval)) detected.push(stryMutAct_9fa48("550") ? "" : (stryCov_9fa48("550"), "low_cadence_intervals"));

    // Pattern 4: long_run_drift
    // Requires per-segment HR data (Strava streams API — Phase 1.4).
    // Gracefully no-op for now.
    // (Placeholder: never fires until segment HR data is available)

    // Pattern 5: low_easy_load_share
    // pct_load_z1_2 < 60% from intensity v2 shadow — single-leg + economy emphasis
    if (stryMutAct_9fa48("553") ? intensityV2 != null || intensityV2.pctEasyLoad < 60 : stryMutAct_9fa48("552") ? false : stryMutAct_9fa48("551") ? true : (stryCov_9fa48("551", "552", "553"), (stryMutAct_9fa48("555") ? intensityV2 == null : stryMutAct_9fa48("554") ? true : (stryCov_9fa48("554", "555"), intensityV2 != null)) && (stryMutAct_9fa48("558") ? intensityV2.pctEasyLoad >= 60 : stryMutAct_9fa48("557") ? intensityV2.pctEasyLoad <= 60 : stryMutAct_9fa48("556") ? true : (stryCov_9fa48("556", "557", "558"), intensityV2.pctEasyLoad < 60)))) {
      if (stryMutAct_9fa48("559")) {
        {}
      } else {
        stryCov_9fa48("559");
        detected.push(stryMutAct_9fa48("560") ? "" : (stryCov_9fa48("560"), "low_easy_load_share"));
      }
    }

    // Pattern 6: default — always present as fallback
    detected.push(stryMutAct_9fa48("561") ? "" : (stryCov_9fa48("561"), "default"));
    return stryMutAct_9fa48("562") ? {} : (stryCov_9fa48("562"), {
      primary: detected[0]!,
      all: detected
    });
  }
}