/**
 * Intensity distribution v2 — TRIMP-weighted dual metric.
 *
 * Computes both time-based and training-load-based zone percentages.
 * The load percentages use Banister (1991) TRIMP with optional Karvonen
 * heart-rate reserve for resting-HR users, or HR-max-only approximation
 * when resting HR is unavailable.
 *
 * Citations (see src/lib/data/citations.ts for verified DOIs):
 *   banister_1991       — original TRIMP formulation
 *   seiler_kjerland_2006 — distribution patterns in elite endurance athletes
 *   treff_2019          — session-goal vs time-in-zone classification bias
 *   stoggl_sperlich_2014 — polarized vs threshold vs pyramidal
 *   casado_2022         — pyramidal vs polarized in sub-elite marathoners
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
export interface SessionMetrics {
  duration_seconds: number;
  avg_hr: number | null;
}
export interface IntensityV2Breakdown {
  // Time-based (matches current v1 shape)
  pctEasyTime: number;
  pctModerateTime: number;
  pctHardTime: number;

  // Load-based (NEW — shadow mode)
  pctEasyLoad: number;
  pctModerateLoad: number;
  pctHardLoad: number;
  totalRunningSeconds: number;
  totalTrimp: number;
  modelUsed: "banister_karvonen" | "karvonen_approx";
  warnings: string[];
}
function clamp(v: number, lo: number, hi: number): number {
  if (stryMutAct_9fa48("43")) {
    {}
  } else {
    stryCov_9fa48("43");
    return stryMutAct_9fa48("44") ? Math.min(lo, Math.min(hi, v)) : (stryCov_9fa48("44"), Math.max(lo, stryMutAct_9fa48("45") ? Math.max(hi, v) : (stryCov_9fa48("45"), Math.min(hi, v))));
  }
}

/** Round to integer; correct the largest bucket so all three sum to 100. */
function roundToHundred(a: number, b: number, c: number): [number, number, number] {
  if (stryMutAct_9fa48("46")) {
    {}
  } else {
    stryCov_9fa48("46");
    const ra = Math.round(a);
    const rb = Math.round(b);
    const rc = Math.round(c);
    const diff = stryMutAct_9fa48("47") ? 100 + (ra + rb + rc) : (stryCov_9fa48("47"), 100 - (stryMutAct_9fa48("48") ? ra + rb - rc : (stryCov_9fa48("48"), (stryMutAct_9fa48("49") ? ra - rb : (stryCov_9fa48("49"), ra + rb)) + rc)));
    // Add the rounding error to the largest bucket
    if (stryMutAct_9fa48("52") ? diff === 0 : stryMutAct_9fa48("51") ? false : stryMutAct_9fa48("50") ? true : (stryCov_9fa48("50", "51", "52"), diff !== 0)) {
      if (stryMutAct_9fa48("53")) {
        {}
      } else {
        stryCov_9fa48("53");
        if (stryMutAct_9fa48("56") ? ra >= rb || ra >= rc : stryMutAct_9fa48("55") ? false : stryMutAct_9fa48("54") ? true : (stryCov_9fa48("54", "55", "56"), (stryMutAct_9fa48("59") ? ra < rb : stryMutAct_9fa48("58") ? ra > rb : stryMutAct_9fa48("57") ? true : (stryCov_9fa48("57", "58", "59"), ra >= rb)) && (stryMutAct_9fa48("62") ? ra < rc : stryMutAct_9fa48("61") ? ra > rc : stryMutAct_9fa48("60") ? true : (stryCov_9fa48("60", "61", "62"), ra >= rc)))) return stryMutAct_9fa48("63") ? [] : (stryCov_9fa48("63"), [stryMutAct_9fa48("64") ? ra - diff : (stryCov_9fa48("64"), ra + diff), rb, rc]);
        if (stryMutAct_9fa48("67") ? rb >= ra || rb >= rc : stryMutAct_9fa48("66") ? false : stryMutAct_9fa48("65") ? true : (stryCov_9fa48("65", "66", "67"), (stryMutAct_9fa48("70") ? rb < ra : stryMutAct_9fa48("69") ? rb > ra : stryMutAct_9fa48("68") ? true : (stryCov_9fa48("68", "69", "70"), rb >= ra)) && (stryMutAct_9fa48("73") ? rb < rc : stryMutAct_9fa48("72") ? rb > rc : stryMutAct_9fa48("71") ? true : (stryCov_9fa48("71", "72", "73"), rb >= rc)))) return stryMutAct_9fa48("74") ? [] : (stryCov_9fa48("74"), [ra, stryMutAct_9fa48("75") ? rb - diff : (stryCov_9fa48("75"), rb + diff), rc]);
        return stryMutAct_9fa48("76") ? [] : (stryCov_9fa48("76"), [ra, rb, stryMutAct_9fa48("77") ? rc - diff : (stryCov_9fa48("77"), rc + diff)]);
      }
    }
    return stryMutAct_9fa48("78") ? [] : (stryCov_9fa48("78"), [ra, rb, rc]);
  }
}

/**
 * Compute TRIMP-weighted intensity breakdown.
 *
 * @param sessions     Running sessions for the week (non-run sessions are ignored by caller).
 * @param observedMaxHr  Athlete's observed or estimated max HR.
 * @param hrRest       Optional resting HR. When provided, uses Banister-Karvonen model.
 * @param sex          "male" | "female" | "other" | null — affects Banister weighting.
 */
export function computeIntensityV2(sessions: SessionMetrics[], observedMaxHr: number, hrRest: number | null, sex: "male" | "female" | "other" | null): IntensityV2Breakdown {
  if (stryMutAct_9fa48("79")) {
    {}
  } else {
    stryCov_9fa48("79");
    const warnings: string[] = stryMutAct_9fa48("80") ? ["Stryker was here"] : (stryCov_9fa48("80"), []);

    // Buckets by zone
    let easyTimeSec = 0;
    let modTimeSec = 0;
    let hardTimeSec = 0;
    let totalTimeSec = 0;
    let easyTrimp = 0;
    let modTrimp = 0;
    let hardTrimp = 0;
    let totalTrimp = 0;
    const modelUsed: IntensityV2Breakdown["modelUsed"] = (stryMutAct_9fa48("83") ? hrRest == null : stryMutAct_9fa48("82") ? false : stryMutAct_9fa48("81") ? true : (stryCov_9fa48("81", "82", "83"), hrRest != null)) ? stryMutAct_9fa48("84") ? "" : (stryCov_9fa48("84"), "banister_karvonen") : stryMutAct_9fa48("85") ? "" : (stryCov_9fa48("85"), "karvonen_approx");
    if (stryMutAct_9fa48("88") ? hrRest != null : stryMutAct_9fa48("87") ? false : stryMutAct_9fa48("86") ? true : (stryCov_9fa48("86", "87", "88"), hrRest == null)) {
      if (stryMutAct_9fa48("89")) {
        {}
      } else {
        stryCov_9fa48("89");
        warnings.push(stryMutAct_9fa48("90") ? "" : (stryCov_9fa48("90"), "hr_rest missing — TRIMP using HR-max-only approximation"));
      }
    }
    for (const s of sessions) {
      if (stryMutAct_9fa48("91")) {
        {}
      } else {
        stryCov_9fa48("91");
        if (stryMutAct_9fa48("94") ? s.avg_hr == null && observedMaxHr <= 0 : stryMutAct_9fa48("93") ? false : stryMutAct_9fa48("92") ? true : (stryCov_9fa48("92", "93", "94"), (stryMutAct_9fa48("96") ? s.avg_hr != null : stryMutAct_9fa48("95") ? false : (stryCov_9fa48("95", "96"), s.avg_hr == null)) || (stryMutAct_9fa48("99") ? observedMaxHr > 0 : stryMutAct_9fa48("98") ? observedMaxHr < 0 : stryMutAct_9fa48("97") ? false : (stryCov_9fa48("97", "98", "99"), observedMaxHr <= 0)))) continue;
        const durationMin = stryMutAct_9fa48("100") ? s.duration_seconds * 60 : (stryCov_9fa48("100"), s.duration_seconds / 60);
        stryMutAct_9fa48("101") ? totalTimeSec -= s.duration_seconds : (stryCov_9fa48("101"), totalTimeSec += s.duration_seconds);
        let r: number;
        if (stryMutAct_9fa48("104") ? hrRest == null : stryMutAct_9fa48("103") ? false : stryMutAct_9fa48("102") ? true : (stryCov_9fa48("102", "103", "104"), hrRest != null)) {
          if (stryMutAct_9fa48("105")) {
            {}
          } else {
            stryCov_9fa48("105");
            // Karvonen heart-rate reserve
            r = stryMutAct_9fa48("106") ? (s.avg_hr - hrRest) * (observedMaxHr - hrRest) : (stryCov_9fa48("106"), (stryMutAct_9fa48("107") ? s.avg_hr + hrRest : (stryCov_9fa48("107"), s.avg_hr - hrRest)) / (stryMutAct_9fa48("108") ? observedMaxHr + hrRest : (stryCov_9fa48("108"), observedMaxHr - hrRest)));
          }
        } else {
          if (stryMutAct_9fa48("109")) {
            {}
          } else {
            stryCov_9fa48("109");
            // Simple fraction of max HR
            r = stryMutAct_9fa48("110") ? s.avg_hr * observedMaxHr : (stryCov_9fa48("110"), s.avg_hr / observedMaxHr);
          }
        }
        r = clamp(r, 0, 1);

        // Banister TRIMP formula — sex-specific weighting
        // female: trimp = dur_min * r * 0.86 * exp(1.67 * r)
        // male / other: trimp = dur_min * r * 0.64 * exp(1.92 * r)
        const trimp = (stryMutAct_9fa48("113") ? sex !== "female" : stryMutAct_9fa48("112") ? false : stryMutAct_9fa48("111") ? true : (stryCov_9fa48("111", "112", "113"), sex === (stryMutAct_9fa48("114") ? "" : (stryCov_9fa48("114"), "female")))) ? stryMutAct_9fa48("115") ? durationMin * r * 0.86 / Math.exp(1.67 * r) : (stryCov_9fa48("115"), (stryMutAct_9fa48("116") ? durationMin * r / 0.86 : (stryCov_9fa48("116"), (stryMutAct_9fa48("117") ? durationMin / r : (stryCov_9fa48("117"), durationMin * r)) * 0.86)) * Math.exp(stryMutAct_9fa48("118") ? 1.67 / r : (stryCov_9fa48("118"), 1.67 * r))) : stryMutAct_9fa48("119") ? durationMin * r * 0.64 / Math.exp(1.92 * r) : (stryCov_9fa48("119"), (stryMutAct_9fa48("120") ? durationMin * r / 0.64 : (stryCov_9fa48("120"), (stryMutAct_9fa48("121") ? durationMin / r : (stryCov_9fa48("121"), durationMin * r)) * 0.64)) * Math.exp(stryMutAct_9fa48("122") ? 1.92 / r : (stryCov_9fa48("122"), 1.92 * r)));
        stryMutAct_9fa48("123") ? totalTrimp -= trimp : (stryCov_9fa48("123"), totalTrimp += trimp);

        // Zone classification by r:
        //   Z1+Z2 ("easy"):     r < 0.74
        //   Z3 ("moderate"):    0.74 ≤ r < 0.84
        //   Z4+Z5 ("hard"):     r ≥ 0.84
        if (stryMutAct_9fa48("127") ? r >= 0.74 : stryMutAct_9fa48("126") ? r <= 0.74 : stryMutAct_9fa48("125") ? false : stryMutAct_9fa48("124") ? true : (stryCov_9fa48("124", "125", "126", "127"), r < 0.74)) {
          if (stryMutAct_9fa48("128")) {
            {}
          } else {
            stryCov_9fa48("128");
            stryMutAct_9fa48("129") ? easyTimeSec -= s.duration_seconds : (stryCov_9fa48("129"), easyTimeSec += s.duration_seconds);
            stryMutAct_9fa48("130") ? easyTrimp -= trimp : (stryCov_9fa48("130"), easyTrimp += trimp);
          }
        } else if (stryMutAct_9fa48("134") ? r >= 0.84 : stryMutAct_9fa48("133") ? r <= 0.84 : stryMutAct_9fa48("132") ? false : stryMutAct_9fa48("131") ? true : (stryCov_9fa48("131", "132", "133", "134"), r < 0.84)) {
          if (stryMutAct_9fa48("135")) {
            {}
          } else {
            stryCov_9fa48("135");
            stryMutAct_9fa48("136") ? modTimeSec -= s.duration_seconds : (stryCov_9fa48("136"), modTimeSec += s.duration_seconds);
            stryMutAct_9fa48("137") ? modTrimp -= trimp : (stryCov_9fa48("137"), modTrimp += trimp);
          }
        } else {
          if (stryMutAct_9fa48("138")) {
            {}
          } else {
            stryCov_9fa48("138");
            stryMutAct_9fa48("139") ? hardTimeSec -= s.duration_seconds : (stryCov_9fa48("139"), hardTimeSec += s.duration_seconds);
            stryMutAct_9fa48("140") ? hardTrimp -= trimp : (stryCov_9fa48("140"), hardTrimp += trimp);
          }
        }
      }
    }
    if (stryMutAct_9fa48("143") ? totalTimeSec !== 0 : stryMutAct_9fa48("142") ? false : stryMutAct_9fa48("141") ? true : (stryCov_9fa48("141", "142", "143"), totalTimeSec === 0)) {
      if (stryMutAct_9fa48("144")) {
        {}
      } else {
        stryCov_9fa48("144");
        return stryMutAct_9fa48("145") ? {} : (stryCov_9fa48("145"), {
          pctEasyTime: 0,
          pctModerateTime: 0,
          pctHardTime: 0,
          pctEasyLoad: 0,
          pctModerateLoad: 0,
          pctHardLoad: 0,
          totalRunningSeconds: 0,
          totalTrimp: 0,
          modelUsed,
          warnings
        });
      }
    }
    const [pctEasyTime, pctModerateTime, pctHardTime] = roundToHundred(stryMutAct_9fa48("146") ? easyTimeSec / totalTimeSec / 100 : (stryCov_9fa48("146"), (stryMutAct_9fa48("147") ? easyTimeSec * totalTimeSec : (stryCov_9fa48("147"), easyTimeSec / totalTimeSec)) * 100), stryMutAct_9fa48("148") ? modTimeSec / totalTimeSec / 100 : (stryCov_9fa48("148"), (stryMutAct_9fa48("149") ? modTimeSec * totalTimeSec : (stryCov_9fa48("149"), modTimeSec / totalTimeSec)) * 100), stryMutAct_9fa48("150") ? hardTimeSec / totalTimeSec / 100 : (stryCov_9fa48("150"), (stryMutAct_9fa48("151") ? hardTimeSec * totalTimeSec : (stryCov_9fa48("151"), hardTimeSec / totalTimeSec)) * 100));
    let pctEasyLoad = 0;
    let pctModerateLoad = 0;
    let pctHardLoad = 0;
    if (stryMutAct_9fa48("155") ? totalTrimp <= 0 : stryMutAct_9fa48("154") ? totalTrimp >= 0 : stryMutAct_9fa48("153") ? false : stryMutAct_9fa48("152") ? true : (stryCov_9fa48("152", "153", "154", "155"), totalTrimp > 0)) {
      if (stryMutAct_9fa48("156")) {
        {}
      } else {
        stryCov_9fa48("156");
        [pctEasyLoad, pctModerateLoad, pctHardLoad] = roundToHundred(stryMutAct_9fa48("157") ? easyTrimp / totalTrimp / 100 : (stryCov_9fa48("157"), (stryMutAct_9fa48("158") ? easyTrimp * totalTrimp : (stryCov_9fa48("158"), easyTrimp / totalTrimp)) * 100), stryMutAct_9fa48("159") ? modTrimp / totalTrimp / 100 : (stryCov_9fa48("159"), (stryMutAct_9fa48("160") ? modTrimp * totalTrimp : (stryCov_9fa48("160"), modTrimp / totalTrimp)) * 100), stryMutAct_9fa48("161") ? hardTrimp / totalTrimp / 100 : (stryCov_9fa48("161"), (stryMutAct_9fa48("162") ? hardTrimp * totalTrimp : (stryCov_9fa48("162"), hardTrimp / totalTrimp)) * 100));
      }
    }
    return stryMutAct_9fa48("163") ? {} : (stryCov_9fa48("163"), {
      pctEasyTime,
      pctModerateTime,
      pctHardTime,
      pctEasyLoad,
      pctModerateLoad,
      pctHardLoad,
      totalRunningSeconds: totalTimeSec,
      totalTrimp,
      modelUsed,
      warnings
    });
  }
}