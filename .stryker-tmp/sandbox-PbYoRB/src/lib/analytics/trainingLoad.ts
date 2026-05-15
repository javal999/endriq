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
import type { BadgeTone } from "@/lib/report/model";
export interface LoadMetrics {
  acuteLoad: number;
  chronicLoad: number | null;
  loadRatio: number | null;
  statusWord: string;
  tone: BadgeTone;
}
function stressVal(raw: number | string | null | undefined): number {
  if (stryMutAct_9fa48("787")) {
    {}
  } else {
    stryCov_9fa48("787");
    if (stryMutAct_9fa48("790") ? raw != null : stryMutAct_9fa48("789") ? false : stryMutAct_9fa48("788") ? true : (stryCov_9fa48("788", "789", "790"), raw == null)) return 0;
    const n = (stryMutAct_9fa48("793") ? typeof raw !== "number" : stryMutAct_9fa48("792") ? false : stryMutAct_9fa48("791") ? true : (stryCov_9fa48("791", "792", "793"), typeof raw === (stryMutAct_9fa48("794") ? "" : (stryCov_9fa48("794"), "number")))) ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
}
function sumStressInRange(workouts: {
  started_at: string;
  training_stress: unknown;
}[], startMs: number, endMsExclusive: number): number {
  if (stryMutAct_9fa48("795")) {
    {}
  } else {
    stryCov_9fa48("795");
    let s = 0;
    for (const w of workouts) {
      if (stryMutAct_9fa48("796")) {
        {}
      } else {
        stryCov_9fa48("796");
        const t = new Date(w.started_at).getTime();
        if (stryMutAct_9fa48("799") ? t >= startMs || t < endMsExclusive : stryMutAct_9fa48("798") ? false : stryMutAct_9fa48("797") ? true : (stryCov_9fa48("797", "798", "799"), (stryMutAct_9fa48("802") ? t < startMs : stryMutAct_9fa48("801") ? t > startMs : stryMutAct_9fa48("800") ? true : (stryCov_9fa48("800", "801", "802"), t >= startMs)) && (stryMutAct_9fa48("805") ? t >= endMsExclusive : stryMutAct_9fa48("804") ? t <= endMsExclusive : stryMutAct_9fa48("803") ? true : (stryCov_9fa48("803", "804", "805"), t < endMsExclusive)))) stryMutAct_9fa48("806") ? s -= stressVal(w.training_stress as number | string | null) : (stryCov_9fa48("806"), s += stressVal(w.training_stress as number | string | null));
      }
    }
    return s;
  }
}

/** Acute = trailing 7d ending week boundary; chronic = mean of four prior non-overlapping 7d buckets. */
export function computeLoadMetrics(workouts: {
  started_at: string;
  training_stress: unknown;
}[], weekEndExclusiveMs: number): LoadMetrics {
  if (stryMutAct_9fa48("807")) {
    {}
  } else {
    stryCov_9fa48("807");
    const acuteStart = stryMutAct_9fa48("808") ? weekEndExclusiveMs + 7 * 86400000 : (stryCov_9fa48("808"), weekEndExclusiveMs - (stryMutAct_9fa48("809") ? 7 / 86400000 : (stryCov_9fa48("809"), 7 * 86400000)));
    const acuteLoad = sumStressInRange(workouts, acuteStart, weekEndExclusiveMs);
    const weeklyTotals: number[] = stryMutAct_9fa48("810") ? ["Stryker was here"] : (stryCov_9fa48("810"), []);
    for (let i = 1; stryMutAct_9fa48("813") ? i > 4 : stryMutAct_9fa48("812") ? i < 4 : stryMutAct_9fa48("811") ? false : (stryCov_9fa48("811", "812", "813"), i <= 4); stryMutAct_9fa48("814") ? i -= 1 : (stryCov_9fa48("814"), i += 1)) {
      if (stryMutAct_9fa48("815")) {
        {}
      } else {
        stryCov_9fa48("815");
        const winEnd = stryMutAct_9fa48("816") ? weekEndExclusiveMs + i * 7 * 86400000 : (stryCov_9fa48("816"), weekEndExclusiveMs - (stryMutAct_9fa48("817") ? i * 7 / 86400000 : (stryCov_9fa48("817"), (stryMutAct_9fa48("818") ? i / 7 : (stryCov_9fa48("818"), i * 7)) * 86400000)));
        const winStart = stryMutAct_9fa48("819") ? winEnd + 7 * 86400000 : (stryCov_9fa48("819"), winEnd - (stryMutAct_9fa48("820") ? 7 / 86400000 : (stryCov_9fa48("820"), 7 * 86400000)));
        weeklyTotals.push(sumStressInRange(workouts, winStart, winEnd));
      }
    }
    const chronicSum = weeklyTotals.reduce(stryMutAct_9fa48("821") ? () => undefined : (stryCov_9fa48("821"), (a, b) => stryMutAct_9fa48("822") ? a - b : (stryCov_9fa48("822"), a + b)), 0);
    const chronicLoad = (stryMutAct_9fa48("826") ? chronicSum <= 0 : stryMutAct_9fa48("825") ? chronicSum >= 0 : stryMutAct_9fa48("824") ? false : stryMutAct_9fa48("823") ? true : (stryCov_9fa48("823", "824", "825", "826"), chronicSum > 0)) ? stryMutAct_9fa48("827") ? chronicSum * weeklyTotals.length : (stryCov_9fa48("827"), chronicSum / weeklyTotals.length) : null;
    const loadRatio = (stryMutAct_9fa48("830") ? chronicLoad != null || chronicLoad > 0 : stryMutAct_9fa48("829") ? false : stryMutAct_9fa48("828") ? true : (stryCov_9fa48("828", "829", "830"), (stryMutAct_9fa48("832") ? chronicLoad == null : stryMutAct_9fa48("831") ? true : (stryCov_9fa48("831", "832"), chronicLoad != null)) && (stryMutAct_9fa48("835") ? chronicLoad <= 0 : stryMutAct_9fa48("834") ? chronicLoad >= 0 : stryMutAct_9fa48("833") ? true : (stryCov_9fa48("833", "834", "835"), chronicLoad > 0)))) ? stryMutAct_9fa48("836") ? acuteLoad * chronicLoad : (stryCov_9fa48("836"), acuteLoad / chronicLoad) : null;
    let statusWord = stryMutAct_9fa48("837") ? "" : (stryCov_9fa48("837"), "Normal");
    let tone: BadgeTone = stryMutAct_9fa48("838") ? "" : (stryCov_9fa48("838"), "good");
    if (stryMutAct_9fa48("841") ? loadRatio != null : stryMutAct_9fa48("840") ? false : stryMutAct_9fa48("839") ? true : (stryCov_9fa48("839", "840", "841"), loadRatio == null)) {
      if (stryMutAct_9fa48("842")) {
        {}
      } else {
        stryCov_9fa48("842");
        statusWord = stryMutAct_9fa48("843") ? "" : (stryCov_9fa48("843"), "—");
        tone = stryMutAct_9fa48("844") ? "" : (stryCov_9fa48("844"), "warn");
      }
    } else if (stryMutAct_9fa48("848") ? loadRatio <= 1.5 : stryMutAct_9fa48("847") ? loadRatio >= 1.5 : stryMutAct_9fa48("846") ? false : stryMutAct_9fa48("845") ? true : (stryCov_9fa48("845", "846", "847", "848"), loadRatio > 1.5)) {
      if (stryMutAct_9fa48("849")) {
        {}
      } else {
        stryCov_9fa48("849");
        statusWord = stryMutAct_9fa48("850") ? "" : (stryCov_9fa48("850"), "Spike");
        tone = stryMutAct_9fa48("851") ? "" : (stryCov_9fa48("851"), "bad");
      }
    } else if (stryMutAct_9fa48("855") ? loadRatio <= 1.3 : stryMutAct_9fa48("854") ? loadRatio >= 1.3 : stryMutAct_9fa48("853") ? false : stryMutAct_9fa48("852") ? true : (stryCov_9fa48("852", "853", "854", "855"), loadRatio > 1.3)) {
      if (stryMutAct_9fa48("856")) {
        {}
      } else {
        stryCov_9fa48("856");
        statusWord = stryMutAct_9fa48("857") ? "" : (stryCov_9fa48("857"), "Elevated");
        tone = stryMutAct_9fa48("858") ? "" : (stryCov_9fa48("858"), "warn");
      }
    } else if (stryMutAct_9fa48("862") ? loadRatio >= 0.8 : stryMutAct_9fa48("861") ? loadRatio <= 0.8 : stryMutAct_9fa48("860") ? false : stryMutAct_9fa48("859") ? true : (stryCov_9fa48("859", "860", "861", "862"), loadRatio < 0.8)) {
      if (stryMutAct_9fa48("863")) {
        {}
      } else {
        stryCov_9fa48("863");
        statusWord = stryMutAct_9fa48("864") ? "" : (stryCov_9fa48("864"), "Low");
        tone = stryMutAct_9fa48("865") ? "" : (stryCov_9fa48("865"), "good");
      }
    }
    return stryMutAct_9fa48("866") ? {} : (stryCov_9fa48("866"), {
      acuteLoad,
      chronicLoad,
      loadRatio,
      statusWord,
      tone
    });
  }
}