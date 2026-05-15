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
import type { LoadMetrics } from "@/lib/analytics/trainingLoad";
import type { IntensityBreakdown } from "@/lib/analytics/intensityDistribution";
import { citationToLink } from "@/lib/data/citations";
export interface WorkoutForRules {
  sport_type: string;
  session_label: string | null;
  started_at: string;
  duration_seconds: number;
  avg_hr: number | null;
  avg_cadence: number | null;
}
function utcDayKey(iso: string): string {
  if (stryMutAct_9fa48("164")) {
    {}
  } else {
    stryCov_9fa48("164");
    const d = new Date(iso);
    if (stryMutAct_9fa48("166") ? false : stryMutAct_9fa48("165") ? true : (stryCov_9fa48("165", "166"), Number.isNaN(d.getTime()))) return stryMutAct_9fa48("167") ? iso : (stryCov_9fa48("167"), iso.slice(0, 10));
    const y = d.getUTCFullYear();
    const m = String(stryMutAct_9fa48("168") ? d.getUTCMonth() - 1 : (stryCov_9fa48("168"), d.getUTCMonth() + 1)).padStart(2, stryMutAct_9fa48("169") ? "" : (stryCov_9fa48("169"), "0"));
    const day = String(d.getUTCDate()).padStart(2, stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), "0"));
    return stryMutAct_9fa48("171") ? `` : (stryCov_9fa48("171"), `${y}-${m}-${day}`);
  }
}

/** Days with at least one workout that is not a pure recovery run day (exclude days where only recovery runs). */
function trainingDayKeys(workouts: WorkoutForRules[]): Set<string> {
  if (stryMutAct_9fa48("172")) {
    {}
  } else {
    stryCov_9fa48("172");
    const byDay = new Map<string, WorkoutForRules[]>();
    for (const w of workouts) {
      if (stryMutAct_9fa48("173")) {
        {}
      } else {
        stryCov_9fa48("173");
        const k = utcDayKey(w.started_at);
        const arr = stryMutAct_9fa48("174") ? byDay.get(k) && [] : (stryCov_9fa48("174"), byDay.get(k) ?? (stryMutAct_9fa48("175") ? ["Stryker was here"] : (stryCov_9fa48("175"), [])));
        arr.push(w);
        byDay.set(k, arr);
      }
    }
    const keys = new Set<string>();
    for (const [day, list] of byDay) {
      if (stryMutAct_9fa48("176")) {
        {}
      } else {
        stryCov_9fa48("176");
        const onlyRecoveryRun = stryMutAct_9fa48("179") ? list.length > 0 || list.every(x => x.sport_type === "run" && x.session_label === "recovery") : stryMutAct_9fa48("178") ? false : stryMutAct_9fa48("177") ? true : (stryCov_9fa48("177", "178", "179"), (stryMutAct_9fa48("182") ? list.length <= 0 : stryMutAct_9fa48("181") ? list.length >= 0 : stryMutAct_9fa48("180") ? true : (stryCov_9fa48("180", "181", "182"), list.length > 0)) && (stryMutAct_9fa48("183") ? list.some(x => x.sport_type === "run" && x.session_label === "recovery") : (stryCov_9fa48("183"), list.every(stryMutAct_9fa48("184") ? () => undefined : (stryCov_9fa48("184"), x => stryMutAct_9fa48("187") ? x.sport_type === "run" || x.session_label === "recovery" : stryMutAct_9fa48("186") ? false : stryMutAct_9fa48("185") ? true : (stryCov_9fa48("185", "186", "187"), (stryMutAct_9fa48("189") ? x.sport_type !== "run" : stryMutAct_9fa48("188") ? true : (stryCov_9fa48("188", "189"), x.sport_type === (stryMutAct_9fa48("190") ? "" : (stryCov_9fa48("190"), "run")))) && (stryMutAct_9fa48("192") ? x.session_label !== "recovery" : stryMutAct_9fa48("191") ? true : (stryCov_9fa48("191", "192"), x.session_label === (stryMutAct_9fa48("193") ? "" : (stryCov_9fa48("193"), "recovery"))))))))));
        if (stryMutAct_9fa48("196") ? false : stryMutAct_9fa48("195") ? true : stryMutAct_9fa48("194") ? onlyRecoveryRun : (stryCov_9fa48("194", "195", "196"), !onlyRecoveryRun)) keys.add(day);
      }
    }
    return keys;
  }
}
function maxConsecutiveDayStreak(dayKeys: Set<string>): number {
  if (stryMutAct_9fa48("197")) {
    {}
  } else {
    stryCov_9fa48("197");
    if (stryMutAct_9fa48("200") ? dayKeys.size !== 0 : stryMutAct_9fa48("199") ? false : stryMutAct_9fa48("198") ? true : (stryCov_9fa48("198", "199", "200"), dayKeys.size === 0)) return 0;
    const sorted = stryMutAct_9fa48("201") ? [...dayKeys] : (stryCov_9fa48("201"), (stryMutAct_9fa48("202") ? [] : (stryCov_9fa48("202"), [...dayKeys])).sort());
    let best = 1;
    let cur = 1;
    for (let i = 1; stryMutAct_9fa48("205") ? i >= sorted.length : stryMutAct_9fa48("204") ? i <= sorted.length : stryMutAct_9fa48("203") ? false : (stryCov_9fa48("203", "204", "205"), i < sorted.length); stryMutAct_9fa48("206") ? i -= 1 : (stryCov_9fa48("206"), i += 1)) {
      if (stryMutAct_9fa48("207")) {
        {}
      } else {
        stryCov_9fa48("207");
        const prev = sorted[stryMutAct_9fa48("208") ? i + 1 : (stryCov_9fa48("208"), i - 1)];
        const curDay = sorted[i];
        const prevMs = Date.parse(stryMutAct_9fa48("209") ? `` : (stryCov_9fa48("209"), `${prev}T12:00:00Z`));
        const curMs = Date.parse(stryMutAct_9fa48("210") ? `` : (stryCov_9fa48("210"), `${curDay}T12:00:00Z`));
        const delta = stryMutAct_9fa48("211") ? (curMs - prevMs) * 86400000 : (stryCov_9fa48("211"), (stryMutAct_9fa48("212") ? curMs + prevMs : (stryCov_9fa48("212"), curMs - prevMs)) / 86400000);
        if (stryMutAct_9fa48("215") ? delta !== 1 : stryMutAct_9fa48("214") ? false : stryMutAct_9fa48("213") ? true : (stryCov_9fa48("213", "214", "215"), delta === 1)) {
          if (stryMutAct_9fa48("216")) {
            {}
          } else {
            stryCov_9fa48("216");
            stryMutAct_9fa48("217") ? cur -= 1 : (stryCov_9fa48("217"), cur += 1);
            best = stryMutAct_9fa48("218") ? Math.min(best, cur) : (stryCov_9fa48("218"), Math.max(best, cur));
          }
        } else {
          if (stryMutAct_9fa48("219")) {
            {}
          } else {
            stryCov_9fa48("219");
            cur = 1;
          }
        }
      }
    }
    return best;
  }
}
export function computeRuleFindings(options: {
  weekWorkouts: WorkoutForRules[];
  extendedWorkouts: WorkoutForRules[];
  observedMaxHr: number;
  intensity: IntensityBreakdown;
  load: LoadMetrics;
  weekStartIso: string;
  weekEndExclusiveIso: string;
}): WeeklyReportModel["findings"] {
  if (stryMutAct_9fa48("220")) {
    {}
  } else {
    stryCov_9fa48("220");
    const out: WeeklyReportModel["findings"] = stryMutAct_9fa48("221") ? ["Stryker was here"] : (stryCov_9fa48("221"), []);
    const weekStartMs = Date.parse(options.weekStartIso);
    const weekEndMs = Date.parse(options.weekEndExclusiveIso);

    // Rule 1 — PHASE-0-BUILD: under 70% easy → high (summary-session HR approximation)
    if (stryMutAct_9fa48("224") ? options.intensity.totalRunningSeconds > 120 || options.intensity.pctEasy < 70 : stryMutAct_9fa48("223") ? false : stryMutAct_9fa48("222") ? true : (stryCov_9fa48("222", "223", "224"), (stryMutAct_9fa48("227") ? options.intensity.totalRunningSeconds <= 120 : stryMutAct_9fa48("226") ? options.intensity.totalRunningSeconds >= 120 : stryMutAct_9fa48("225") ? true : (stryCov_9fa48("225", "226", "227"), options.intensity.totalRunningSeconds > 120)) && (stryMutAct_9fa48("230") ? options.intensity.pctEasy >= 70 : stryMutAct_9fa48("229") ? options.intensity.pctEasy <= 70 : stryMutAct_9fa48("228") ? true : (stryCov_9fa48("228", "229", "230"), options.intensity.pctEasy < 70)))) {
      if (stryMutAct_9fa48("231")) {
        {}
      } else {
        stryCov_9fa48("231");
        out.push(stryMutAct_9fa48("232") ? {} : (stryCov_9fa48("232"), {
          severity: stryMutAct_9fa48("233") ? "" : (stryCov_9fa48("233"), "High"),
          tone: stryMutAct_9fa48("234") ? "" : (stryCov_9fa48("234"), "bad"),
          title: stryMutAct_9fa48("235") ? "" : (stryCov_9fa48("235"), "Easy volume below research target"),
          body: stryMutAct_9fa48("236") ? `` : (stryCov_9fa48("236"), `${options.intensity.pctEasy}% of running time in Zone 1–2 this week. Polarized training targets roughly 80% easy / 10% moderate / 10% hard.`),
          citations: stryMutAct_9fa48("237") ? [] : (stryCov_9fa48("237"), [citationToLink(stryMutAct_9fa48("238") ? "" : (stryCov_9fa48("238"), "seiler_2010")), citationToLink(stryMutAct_9fa48("239") ? "" : (stryCov_9fa48("239"), "stoggl_sperlich_2014"))]),
          confidence: stryMutAct_9fa48("240") ? "" : (stryCov_9fa48("240"), "Confidence: High — pattern visible across the week"),
          evidenceStrength: stryMutAct_9fa48("241") ? "" : (stryCov_9fa48("241"), "Strong")
        }));
      }
    }

    // Rule 2 — load spike
    if (stryMutAct_9fa48("244") ? options.load.loadRatio != null || options.load.loadRatio > 1.5 : stryMutAct_9fa48("243") ? false : stryMutAct_9fa48("242") ? true : (stryCov_9fa48("242", "243", "244"), (stryMutAct_9fa48("246") ? options.load.loadRatio == null : stryMutAct_9fa48("245") ? true : (stryCov_9fa48("245", "246"), options.load.loadRatio != null)) && (stryMutAct_9fa48("249") ? options.load.loadRatio <= 1.5 : stryMutAct_9fa48("248") ? options.load.loadRatio >= 1.5 : stryMutAct_9fa48("247") ? true : (stryCov_9fa48("247", "248", "249"), options.load.loadRatio > 1.5)))) {
      if (stryMutAct_9fa48("250")) {
        {}
      } else {
        stryCov_9fa48("250");
        out.push(stryMutAct_9fa48("251") ? {} : (stryCov_9fa48("251"), {
          severity: stryMutAct_9fa48("252") ? "" : (stryCov_9fa48("252"), "High"),
          tone: stryMutAct_9fa48("253") ? "" : (stryCov_9fa48("253"), "bad"),
          title: stryMutAct_9fa48("254") ? "" : (stryCov_9fa48("254"), "Training load spike"),
          body: stryMutAct_9fa48("255") ? `` : (stryCov_9fa48("255"), `Load ratio ${options.load.loadRatio.toFixed(2)} (acute vs chronic). Sharp jumps raise injury risk until chronic catches up.`),
          citations: stryMutAct_9fa48("256") ? [] : (stryCov_9fa48("256"), [citationToLink(stryMutAct_9fa48("257") ? "" : (stryCov_9fa48("257"), "gabbett_2016")), citationToLink(stryMutAct_9fa48("258") ? "" : (stryCov_9fa48("258"), "hulin_2016"))]),
          confidence: stryMutAct_9fa48("259") ? "" : (stryCov_9fa48("259"), "Confidence: High — ratio exceeds consensus spike band"),
          evidenceStrength: stryMutAct_9fa48("260") ? "" : (stryCov_9fa48("260"), "Strong")
        }));
      }
    } else if (stryMutAct_9fa48("263") ? options.load.loadRatio != null || options.load.loadRatio > 1.3 : stryMutAct_9fa48("262") ? false : stryMutAct_9fa48("261") ? true : (stryCov_9fa48("261", "262", "263"), (stryMutAct_9fa48("265") ? options.load.loadRatio == null : stryMutAct_9fa48("264") ? true : (stryCov_9fa48("264", "265"), options.load.loadRatio != null)) && (stryMutAct_9fa48("268") ? options.load.loadRatio <= 1.3 : stryMutAct_9fa48("267") ? options.load.loadRatio >= 1.3 : stryMutAct_9fa48("266") ? true : (stryCov_9fa48("266", "267", "268"), options.load.loadRatio > 1.3)))) {
      if (stryMutAct_9fa48("269")) {
        {}
      } else {
        stryCov_9fa48("269");
        out.push(stryMutAct_9fa48("270") ? {} : (stryCov_9fa48("270"), {
          severity: stryMutAct_9fa48("271") ? "" : (stryCov_9fa48("271"), "Medium"),
          tone: stryMutAct_9fa48("272") ? "" : (stryCov_9fa48("272"), "warn"),
          title: stryMutAct_9fa48("273") ? "" : (stryCov_9fa48("273"), "Elevated training load"),
          body: stryMutAct_9fa48("274") ? `` : (stryCov_9fa48("274"), `Load ratio ${options.load.loadRatio.toFixed(2)}. Monitor recovery and avoid stacking hard sessions.`),
          citations: stryMutAct_9fa48("275") ? [] : (stryCov_9fa48("275"), [citationToLink(stryMutAct_9fa48("276") ? "" : (stryCov_9fa48("276"), "windt_2017"))]),
          confidence: stryMutAct_9fa48("277") ? "" : (stryCov_9fa48("277"), "Confidence: Moderate"),
          evidenceStrength: stryMutAct_9fa48("278") ? "" : (stryCov_9fa48("278"), "Moderate")
        }));
      }
    }

    // Rule 3 — consecutive training days
    const inWeek = stryMutAct_9fa48("279") ? options.weekWorkouts : (stryCov_9fa48("279"), options.weekWorkouts.filter(w => {
      if (stryMutAct_9fa48("280")) {
        {}
      } else {
        stryCov_9fa48("280");
        const t = new Date(w.started_at).getTime();
        return stryMutAct_9fa48("283") ? t >= weekStartMs || t < weekEndMs : stryMutAct_9fa48("282") ? false : stryMutAct_9fa48("281") ? true : (stryCov_9fa48("281", "282", "283"), (stryMutAct_9fa48("286") ? t < weekStartMs : stryMutAct_9fa48("285") ? t > weekStartMs : stryMutAct_9fa48("284") ? true : (stryCov_9fa48("284", "285", "286"), t >= weekStartMs)) && (stryMutAct_9fa48("289") ? t >= weekEndMs : stryMutAct_9fa48("288") ? t <= weekEndMs : stryMutAct_9fa48("287") ? true : (stryCov_9fa48("287", "288", "289"), t < weekEndMs)));
      }
    }));
    const streak = maxConsecutiveDayStreak(trainingDayKeys(inWeek));
    // PHASE-0-BUILD: 7+ consecutive days → medium
    if (stryMutAct_9fa48("293") ? streak < 7 : stryMutAct_9fa48("292") ? streak > 7 : stryMutAct_9fa48("291") ? false : stryMutAct_9fa48("290") ? true : (stryCov_9fa48("290", "291", "292", "293"), streak >= 7)) {
      if (stryMutAct_9fa48("294")) {
        {}
      } else {
        stryCov_9fa48("294");
        out.push(stryMutAct_9fa48("295") ? {} : (stryCov_9fa48("295"), {
          severity: stryMutAct_9fa48("296") ? "" : (stryCov_9fa48("296"), "Medium"),
          tone: stryMutAct_9fa48("297") ? "" : (stryCov_9fa48("297"), "warn"),
          title: stryMutAct_9fa48("298") ? "" : (stryCov_9fa48("298"), "Week without a full rest day"),
          body: stryMutAct_9fa48("299") ? `` : (stryCov_9fa48("299"), `${streak} consecutive training days with structured work. Planning easy or rest days supports adaptation.`),
          citations: stryMutAct_9fa48("300") ? [] : (stryCov_9fa48("300"), [citationToLink(stryMutAct_9fa48("301") ? "" : (stryCov_9fa48("301"), "budgett_1998"))]),
          confidence: stryMutAct_9fa48("302") ? "" : (stryCov_9fa48("302"), "Confidence: Moderate — calendar inference only"),
          evidenceStrength: stryMutAct_9fa48("303") ? "" : (stryCov_9fa48("303"), "Moderate")
        }));
      }
    }

    // Rule 4 — long run HR drift
    const longRuns = stryMutAct_9fa48("304") ? inWeek : (stryCov_9fa48("304"), inWeek.filter(stryMutAct_9fa48("305") ? () => undefined : (stryCov_9fa48("305"), w => stryMutAct_9fa48("308") ? w.sport_type === "run" && w.session_label === "long_run" && w.avg_hr != null || options.observedMaxHr > 0 : stryMutAct_9fa48("307") ? false : stryMutAct_9fa48("306") ? true : (stryCov_9fa48("306", "307", "308"), (stryMutAct_9fa48("310") ? w.sport_type === "run" && w.session_label === "long_run" || w.avg_hr != null : stryMutAct_9fa48("309") ? true : (stryCov_9fa48("309", "310"), (stryMutAct_9fa48("312") ? w.sport_type === "run" || w.session_label === "long_run" : stryMutAct_9fa48("311") ? true : (stryCov_9fa48("311", "312"), (stryMutAct_9fa48("314") ? w.sport_type !== "run" : stryMutAct_9fa48("313") ? true : (stryCov_9fa48("313", "314"), w.sport_type === (stryMutAct_9fa48("315") ? "" : (stryCov_9fa48("315"), "run")))) && (stryMutAct_9fa48("317") ? w.session_label !== "long_run" : stryMutAct_9fa48("316") ? true : (stryCov_9fa48("316", "317"), w.session_label === (stryMutAct_9fa48("318") ? "" : (stryCov_9fa48("318"), "long_run")))))) && (stryMutAct_9fa48("320") ? w.avg_hr == null : stryMutAct_9fa48("319") ? true : (stryCov_9fa48("319", "320"), w.avg_hr != null)))) && (stryMutAct_9fa48("323") ? options.observedMaxHr <= 0 : stryMutAct_9fa48("322") ? options.observedMaxHr >= 0 : stryMutAct_9fa48("321") ? true : (stryCov_9fa48("321", "322", "323"), options.observedMaxHr > 0))))));
    for (const w of longRuns) {
      if (stryMutAct_9fa48("324")) {
        {}
      } else {
        stryCov_9fa48("324");
        const frac = stryMutAct_9fa48("325") ? (w.avg_hr as number) * options.observedMaxHr : (stryCov_9fa48("325"), (w.avg_hr as number) / options.observedMaxHr);
        if (stryMutAct_9fa48("329") ? frac <= 0.8 : stryMutAct_9fa48("328") ? frac >= 0.8 : stryMutAct_9fa48("327") ? false : stryMutAct_9fa48("326") ? true : (stryCov_9fa48("326", "327", "328", "329"), frac > 0.8)) {
          if (stryMutAct_9fa48("330")) {
            {}
          } else {
            stryCov_9fa48("330");
            out.push(stryMutAct_9fa48("331") ? {} : (stryCov_9fa48("331"), {
              severity: stryMutAct_9fa48("332") ? "" : (stryCov_9fa48("332"), "Medium"),
              tone: stryMutAct_9fa48("333") ? "" : (stryCov_9fa48("333"), "warn"),
              title: stryMutAct_9fa48("334") ? "" : (stryCov_9fa48("334"), "Long run pace ties easy runs"),
              body: stryMutAct_9fa48("335") ? "" : (stryCov_9fa48("335"), "Average HR on the long run sits close to general aerobic efforts. Consider slowing early miles so the last third stays controlled."),
              citations: stryMutAct_9fa48("336") ? [] : (stryCov_9fa48("336"), [citationToLink(stryMutAct_9fa48("337") ? "" : (stryCov_9fa48("337"), "laursen_2010"))]),
              confidence: stryMutAct_9fa48("338") ? "" : (stryCov_9fa48("338"), "Confidence: Moderate — single-session avg HR"),
              evidenceStrength: stryMutAct_9fa48("339") ? "" : (stryCov_9fa48("339"), "Moderate")
            }));
            break;
          }
        }
      }
    }

    // Rule 5 — turnover on quality (when cadence exists)
    const intervals = stryMutAct_9fa48("340") ? inWeek : (stryCov_9fa48("340"), inWeek.filter(stryMutAct_9fa48("341") ? () => undefined : (stryCov_9fa48("341"), w => stryMutAct_9fa48("344") ? w.sport_type === "run" && w.session_label === "interval" && w.avg_cadence != null || w.avg_cadence < 160 : stryMutAct_9fa48("343") ? false : stryMutAct_9fa48("342") ? true : (stryCov_9fa48("342", "343", "344"), (stryMutAct_9fa48("346") ? w.sport_type === "run" && w.session_label === "interval" || w.avg_cadence != null : stryMutAct_9fa48("345") ? true : (stryCov_9fa48("345", "346"), (stryMutAct_9fa48("348") ? w.sport_type === "run" || w.session_label === "interval" : stryMutAct_9fa48("347") ? true : (stryCov_9fa48("347", "348"), (stryMutAct_9fa48("350") ? w.sport_type !== "run" : stryMutAct_9fa48("349") ? true : (stryCov_9fa48("349", "350"), w.sport_type === (stryMutAct_9fa48("351") ? "" : (stryCov_9fa48("351"), "run")))) && (stryMutAct_9fa48("353") ? w.session_label !== "interval" : stryMutAct_9fa48("352") ? true : (stryCov_9fa48("352", "353"), w.session_label === (stryMutAct_9fa48("354") ? "" : (stryCov_9fa48("354"), "interval")))))) && (stryMutAct_9fa48("356") ? w.avg_cadence == null : stryMutAct_9fa48("355") ? true : (stryCov_9fa48("355", "356"), w.avg_cadence != null)))) && (stryMutAct_9fa48("359") ? w.avg_cadence >= 160 : stryMutAct_9fa48("358") ? w.avg_cadence <= 160 : stryMutAct_9fa48("357") ? true : (stryCov_9fa48("357", "358", "359"), w.avg_cadence < 160))))));
    if (stryMutAct_9fa48("363") ? intervals.length <= 0 : stryMutAct_9fa48("362") ? intervals.length >= 0 : stryMutAct_9fa48("361") ? false : stryMutAct_9fa48("360") ? true : (stryCov_9fa48("360", "361", "362", "363"), intervals.length > 0)) {
      if (stryMutAct_9fa48("364")) {
        {}
      } else {
        stryCov_9fa48("364");
        out.push(stryMutAct_9fa48("365") ? {} : (stryCov_9fa48("365"), {
          severity: stryMutAct_9fa48("366") ? "" : (stryCov_9fa48("366"), "Low"),
          tone: stryMutAct_9fa48("367") ? "" : (stryCov_9fa48("367"), "low"),
          title: stryMutAct_9fa48("368") ? "" : (stryCov_9fa48("368"), "Low cadence on intervals"),
          body: stryMutAct_9fa48("369") ? "" : (stryCov_9fa48("369"), "Stride turnover looks low on at least one interval session. Light strides or slight inclines can cue quicker turnover without forcing pace."),
          citations: stryMutAct_9fa48("370") ? [] : (stryCov_9fa48("370"), [citationToLink(stryMutAct_9fa48("371") ? "" : (stryCov_9fa48("371"), "heiderscheit_2011"))]),
          confidence: stryMutAct_9fa48("372") ? "" : (stryCov_9fa48("372"), "Confidence: Low — cadence from vendor summary only"),
          evidenceStrength: stryMutAct_9fa48("373") ? "" : (stryCov_9fa48("373"), "Limited")
        }));
      }
    }

    // Rule 6 — interference window after lifting
    const sorted = stryMutAct_9fa48("374") ? [...options.extendedWorkouts] : (stryCov_9fa48("374"), (stryMutAct_9fa48("375") ? [] : (stryCov_9fa48("375"), [...options.extendedWorkouts])).sort(stryMutAct_9fa48("376") ? () => undefined : (stryCov_9fa48("376"), (a, b) => stryMutAct_9fa48("377") ? new Date(a.started_at).getTime() + new Date(b.started_at).getTime() : (stryCov_9fa48("377"), new Date(a.started_at).getTime() - new Date(b.started_at).getTime()))));
    outer: for (let i = 0; stryMutAct_9fa48("380") ? i >= sorted.length : stryMutAct_9fa48("379") ? i <= sorted.length : stryMutAct_9fa48("378") ? false : (stryCov_9fa48("378", "379", "380"), i < sorted.length); stryMutAct_9fa48("381") ? i -= 1 : (stryCov_9fa48("381"), i += 1)) {
      if (stryMutAct_9fa48("382")) {
        {}
      } else {
        stryCov_9fa48("382");
        const s = sorted[i];
        if (stryMutAct_9fa48("385") ? s.sport_type === "strength" : stryMutAct_9fa48("384") ? false : stryMutAct_9fa48("383") ? true : (stryCov_9fa48("383", "384", "385"), s.sport_type !== (stryMutAct_9fa48("386") ? "" : (stryCov_9fa48("386"), "strength")))) continue;
        const strengthEnd = stryMutAct_9fa48("387") ? new Date(s.started_at).getTime() - s.duration_seconds * 1000 : (stryCov_9fa48("387"), new Date(s.started_at).getTime() + (stryMutAct_9fa48("388") ? s.duration_seconds / 1000 : (stryCov_9fa48("388"), s.duration_seconds * 1000)));
        for (let j = stryMutAct_9fa48("389") ? i - 1 : (stryCov_9fa48("389"), i + 1); stryMutAct_9fa48("392") ? j >= sorted.length : stryMutAct_9fa48("391") ? j <= sorted.length : stryMutAct_9fa48("390") ? false : (stryCov_9fa48("390", "391", "392"), j < sorted.length); stryMutAct_9fa48("393") ? j -= 1 : (stryCov_9fa48("393"), j += 1)) {
          if (stryMutAct_9fa48("394")) {
            {}
          } else {
            stryCov_9fa48("394");
            const q = sorted[j];
            if (stryMutAct_9fa48("397") ? q.sport_type === "run" : stryMutAct_9fa48("396") ? false : stryMutAct_9fa48("395") ? true : (stryCov_9fa48("395", "396", "397"), q.sport_type !== (stryMutAct_9fa48("398") ? "" : (stryCov_9fa48("398"), "run")))) continue;
            if (stryMutAct_9fa48("401") ? q.session_label !== "interval" || q.session_label !== "tempo" : stryMutAct_9fa48("400") ? false : stryMutAct_9fa48("399") ? true : (stryCov_9fa48("399", "400", "401"), (stryMutAct_9fa48("403") ? q.session_label === "interval" : stryMutAct_9fa48("402") ? true : (stryCov_9fa48("402", "403"), q.session_label !== (stryMutAct_9fa48("404") ? "" : (stryCov_9fa48("404"), "interval")))) && (stryMutAct_9fa48("406") ? q.session_label === "tempo" : stryMutAct_9fa48("405") ? true : (stryCov_9fa48("405", "406"), q.session_label !== (stryMutAct_9fa48("407") ? "" : (stryCov_9fa48("407"), "tempo")))))) continue;
            const qs = new Date(q.started_at).getTime();
            const hoursAfter = stryMutAct_9fa48("408") ? (qs - strengthEnd) * 3600000 : (stryCov_9fa48("408"), (stryMutAct_9fa48("409") ? qs + strengthEnd : (stryCov_9fa48("409"), qs - strengthEnd)) / 3600000);
            if (stryMutAct_9fa48("412") ? hoursAfter >= 0 || hoursAfter <= 6 : stryMutAct_9fa48("411") ? false : stryMutAct_9fa48("410") ? true : (stryCov_9fa48("410", "411", "412"), (stryMutAct_9fa48("415") ? hoursAfter < 0 : stryMutAct_9fa48("414") ? hoursAfter > 0 : stryMutAct_9fa48("413") ? true : (stryCov_9fa48("413", "414", "415"), hoursAfter >= 0)) && (stryMutAct_9fa48("418") ? hoursAfter > 6 : stryMutAct_9fa48("417") ? hoursAfter < 6 : stryMutAct_9fa48("416") ? true : (stryCov_9fa48("416", "417", "418"), hoursAfter <= 6)))) {
              if (stryMutAct_9fa48("419")) {
                {}
              } else {
                stryCov_9fa48("419");
                const sev = (stryMutAct_9fa48("423") ? hoursAfter > 2 : stryMutAct_9fa48("422") ? hoursAfter < 2 : stryMutAct_9fa48("421") ? false : stryMutAct_9fa48("420") ? true : (stryCov_9fa48("420", "421", "422", "423"), hoursAfter <= 2)) ? stryMutAct_9fa48("424") ? "" : (stryCov_9fa48("424"), "High") : stryMutAct_9fa48("425") ? "" : (stryCov_9fa48("425"), "Medium");
                const tone = (stryMutAct_9fa48("429") ? hoursAfter > 2 : stryMutAct_9fa48("428") ? hoursAfter < 2 : stryMutAct_9fa48("427") ? false : stryMutAct_9fa48("426") ? true : (stryCov_9fa48("426", "427", "428", "429"), hoursAfter <= 2)) ? stryMutAct_9fa48("430") ? "" : (stryCov_9fa48("430"), "bad") : stryMutAct_9fa48("431") ? "" : (stryCov_9fa48("431"), "warn");
                out.push(stryMutAct_9fa48("432") ? {} : (stryCov_9fa48("432"), {
                  severity: sev,
                  tone,
                  title: stryMutAct_9fa48("433") ? "" : (stryCov_9fa48("433"), "Strength close to a quality run"),
                  body: stryMutAct_9fa48("434") ? `` : (stryCov_9fa48("434"), `Strength ended ~${hoursAfter.toFixed(1)} hours before a ${(stryMutAct_9fa48("437") ? q.session_label !== "interval" : stryMutAct_9fa48("436") ? false : stryMutAct_9fa48("435") ? true : (stryCov_9fa48("435", "436", "437"), q.session_label === (stryMutAct_9fa48("438") ? "" : (stryCov_9fa48("438"), "interval")))) ? stryMutAct_9fa48("439") ? "" : (stryCov_9fa48("439"), "interval") : stryMutAct_9fa48("440") ? "" : (stryCov_9fa48("440"), "tempo")} session. Same-day lifting plus quality running can blunt neuromuscular quality.`),
                  citations: stryMutAct_9fa48("441") ? [] : (stryCov_9fa48("441"), [citationToLink(stryMutAct_9fa48("442") ? "" : (stryCov_9fa48("442"), "fyfe_2014")), citationToLink(stryMutAct_9fa48("443") ? "" : (stryCov_9fa48("443"), "wilson_2012"))]),
                  confidence: (stryMutAct_9fa48("447") ? hoursAfter > 2 : stryMutAct_9fa48("446") ? hoursAfter < 2 : stryMutAct_9fa48("445") ? false : stryMutAct_9fa48("444") ? true : (stryCov_9fa48("444", "445", "446", "447"), hoursAfter <= 2)) ? stryMutAct_9fa48("448") ? "" : (stryCov_9fa48("448"), "Confidence: High — within acute interference window") : stryMutAct_9fa48("449") ? "" : (stryCov_9fa48("449"), "Confidence: Moderate — borderline timing"),
                  evidenceStrength: (stryMutAct_9fa48("453") ? hoursAfter > 2 : stryMutAct_9fa48("452") ? hoursAfter < 2 : stryMutAct_9fa48("451") ? false : stryMutAct_9fa48("450") ? true : (stryCov_9fa48("450", "451", "452", "453"), hoursAfter <= 2)) ? stryMutAct_9fa48("454") ? "" : (stryCov_9fa48("454"), "Strong") : stryMutAct_9fa48("455") ? "" : (stryCov_9fa48("455"), "Moderate")
                }));
                break outer;
              }
            }
            if (stryMutAct_9fa48("459") ? qs <= strengthEnd + 10 * 3600000 : stryMutAct_9fa48("458") ? qs >= strengthEnd + 10 * 3600000 : stryMutAct_9fa48("457") ? false : stryMutAct_9fa48("456") ? true : (stryCov_9fa48("456", "457", "458", "459"), qs > (stryMutAct_9fa48("460") ? strengthEnd - 10 * 3600000 : (stryCov_9fa48("460"), strengthEnd + (stryMutAct_9fa48("461") ? 10 / 3600000 : (stryCov_9fa48("461"), 10 * 3600000)))))) break;
          }
        }
      }
    }
    const rank = stryMutAct_9fa48("462") ? () => undefined : (stryCov_9fa48("462"), (() => {
      const rank = (s: string) => (stryMutAct_9fa48("465") ? s !== "High" : stryMutAct_9fa48("464") ? false : stryMutAct_9fa48("463") ? true : (stryCov_9fa48("463", "464", "465"), s === (stryMutAct_9fa48("466") ? "" : (stryCov_9fa48("466"), "High")))) ? 0 : (stryMutAct_9fa48("469") ? s !== "Medium" : stryMutAct_9fa48("468") ? false : stryMutAct_9fa48("467") ? true : (stryCov_9fa48("467", "468", "469"), s === (stryMutAct_9fa48("470") ? "" : (stryCov_9fa48("470"), "Medium")))) ? 1 : 2;
      return rank;
    })());
    stryMutAct_9fa48("471") ? out : (stryCov_9fa48("471"), out.sort(stryMutAct_9fa48("472") ? () => undefined : (stryCov_9fa48("472"), (a, b) => stryMutAct_9fa48("473") ? rank(a.severity) + rank(b.severity) : (stryCov_9fa48("473"), rank(a.severity) - rank(b.severity)))));
    return out;
  }
}