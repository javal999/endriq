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
export interface IntensityBreakdown {
  pctEasy: number;
  pctModerate: number;
  pctHard: number;
  totalRunningSeconds: number;
}

/**
 * Weight running duration by session-average HR vs observed max HR (summary-data approximation).
 */
export function intensityFromRuns(runs: {
  duration_seconds: number;
  avg_hr: number | null;
}[], observedMaxHr: number): IntensityBreakdown {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    let easy = 0;
    let mod = 0;
    let hard = 0;
    let total = 0;
    for (const r of runs) {
      if (stryMutAct_9fa48("1")) {
        {}
      } else {
        stryCov_9fa48("1");
        if (stryMutAct_9fa48("4") ? r.avg_hr == null && observedMaxHr <= 0 : stryMutAct_9fa48("3") ? false : stryMutAct_9fa48("2") ? true : (stryCov_9fa48("2", "3", "4"), (stryMutAct_9fa48("6") ? r.avg_hr != null : stryMutAct_9fa48("5") ? false : (stryCov_9fa48("5", "6"), r.avg_hr == null)) || (stryMutAct_9fa48("9") ? observedMaxHr > 0 : stryMutAct_9fa48("8") ? observedMaxHr < 0 : stryMutAct_9fa48("7") ? false : (stryCov_9fa48("7", "8", "9"), observedMaxHr <= 0)))) continue;
        const sec = r.duration_seconds;
        stryMutAct_9fa48("10") ? total -= sec : (stryCov_9fa48("10"), total += sec);
        const p = stryMutAct_9fa48("11") ? r.avg_hr * observedMaxHr : (stryCov_9fa48("11"), r.avg_hr / observedMaxHr);
        if (stryMutAct_9fa48("15") ? p >= 0.75 : stryMutAct_9fa48("14") ? p <= 0.75 : stryMutAct_9fa48("13") ? false : stryMutAct_9fa48("12") ? true : (stryCov_9fa48("12", "13", "14", "15"), p < 0.75)) stryMutAct_9fa48("16") ? easy -= sec : (stryCov_9fa48("16"), easy += sec);else if (stryMutAct_9fa48("20") ? p >= 0.85 : stryMutAct_9fa48("19") ? p <= 0.85 : stryMutAct_9fa48("18") ? false : stryMutAct_9fa48("17") ? true : (stryCov_9fa48("17", "18", "19", "20"), p < 0.85)) stryMutAct_9fa48("21") ? mod -= sec : (stryCov_9fa48("21"), mod += sec);else stryMutAct_9fa48("22") ? hard -= sec : (stryCov_9fa48("22"), hard += sec);
      }
    }
    if (stryMutAct_9fa48("26") ? total > 0 : stryMutAct_9fa48("25") ? total < 0 : stryMutAct_9fa48("24") ? false : stryMutAct_9fa48("23") ? true : (stryCov_9fa48("23", "24", "25", "26"), total <= 0)) {
      if (stryMutAct_9fa48("27")) {
        {}
      } else {
        stryCov_9fa48("27");
        return stryMutAct_9fa48("28") ? {} : (stryCov_9fa48("28"), {
          pctEasy: 0,
          pctModerate: 0,
          pctHard: 0,
          totalRunningSeconds: 0
        });
      }
    }
    const pctEasy = Math.round(stryMutAct_9fa48("29") ? easy / total / 100 : (stryCov_9fa48("29"), (stryMutAct_9fa48("30") ? easy * total : (stryCov_9fa48("30"), easy / total)) * 100));
    const pctModerate = Math.round(stryMutAct_9fa48("31") ? mod / total / 100 : (stryCov_9fa48("31"), (stryMutAct_9fa48("32") ? mod * total : (stryCov_9fa48("32"), mod / total)) * 100));
    let pctHard = Math.round(stryMutAct_9fa48("33") ? hard / total / 100 : (stryCov_9fa48("33"), (stryMutAct_9fa48("34") ? hard * total : (stryCov_9fa48("34"), hard / total)) * 100));
    const sum = stryMutAct_9fa48("35") ? pctEasy + pctModerate - pctHard : (stryCov_9fa48("35"), (stryMutAct_9fa48("36") ? pctEasy - pctModerate : (stryCov_9fa48("36"), pctEasy + pctModerate)) + pctHard);
    if (stryMutAct_9fa48("39") ? sum === 100 : stryMutAct_9fa48("38") ? false : stryMutAct_9fa48("37") ? true : (stryCov_9fa48("37", "38", "39"), sum !== 100)) stryMutAct_9fa48("40") ? pctHard -= 100 - sum : (stryCov_9fa48("40"), pctHard += stryMutAct_9fa48("41") ? 100 + sum : (stryCov_9fa48("41"), 100 - sum));
    return stryMutAct_9fa48("42") ? {} : (stryCov_9fa48("42"), {
      pctEasy,
      pctModerate,
      pctHard,
      totalRunningSeconds: total
    });
  }
}