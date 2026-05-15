// @ts-nocheck
import type { BadgeTone } from "@/lib/report/model";
import type { WeeklyReportModel } from "@/lib/report/model";
import type { LlmWeeklySections } from "@/lib/llm/types";

export function weeklySectionsFromFindings(
  findings: WeeklyReportModel["findings"],
): LlmWeeklySections {
  const positives = findings.filter((f) => f.tone === "low");
  const concerns = findings.filter((f) => f.tone !== "low");

  const wentWell =
    positives.length > 0
      ? positives
          .slice(0, 3)
          .map((f) => `${f.title}.`)
          .join(" ")
      : "Training sessions were logged consistently this week. Volume and completion matter as much as any single metric.";

  const needsWork =
    concerns.length > 0
      ? concerns
          .slice(0, 4)
          .map((f) => `${f.title}: ${truncate(f.body, 220)}`)
          .join(" ")
      : "No major rule flags fired. Keep easy days genuinely easy and separate strength from key running sessions when possible.";

  const nextWeek =
    "Bias recovery after hard efforts, keep easy aerobic work below your estimated easy ceiling when HR data looks noisy, and repeat this review next week as more history accumulates.";

  return { wentWell, needsWork, nextWeek };
}

export function intensityExplanationFallback(model: WeeklyReportModel): string {
  const { pctEasy, pctMod, pctHard, verdict, z2CeilingHr } = model.intensity;
  const ceiling =
    z2CeilingHr ??
    Math.round((model.intensity.observedMaxHr * 3) / 4);
  const verdictWord =
    verdict === "good" ? "aligned" : verdict === "warn" ? "mixed" : "skewed";
  return (
    `This week shows ${pctEasy}% easy, ${pctMod}% moderate, and ${pctHard}% hard running time by HR drift versus max HR — distribution looks ${verdictWord} versus an 80 / 10 / 10 polarized heuristic. ` +
    `Use ${ceiling} bpm as a soft ceiling check on easy days when pace feels comfortable but cardiac drift creeps up.`
  );
}

export function sessionStaticExplanation(args: {
  statusLabel: string;
  tone: BadgeTone;
  z2CeilingHr: number;
  observedMaxHr: number;
}): string {
  const { statusLabel, tone, z2CeilingHr, observedMaxHr } = args;
  const easyBandLow = Math.round(observedMaxHr * 0.62);
  if (tone === "bad" && /hard|high/i.test(statusLabel)) {
    return `Heart rate sat higher than typical easy aerobic markers versus your observed max (${observedMaxHr} bpm). On designated easy days, bias slower pacing until averages settle nearer the ${easyBandLow}–${z2CeilingHr} bpm band when drift allows.`;
  }
  if (tone === "warn") {
    return `Session sits between easy and clearly hard. If this was meant as easy volume, treat pace as negotiable and favour cardiac drift trending down over the middle thirds of the run.`;
  }
  if (/good/i.test(statusLabel)) {
    return `Markers fit the intent for this session type relative to your HR band and weekly mix.`;
  }
  return `Interpret alongside week-level intensity mix and recovery; single-session HR noise happens with heat, caffeine, or poor strap contact.`;
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}
