import type { StrengthRecommendationModel } from "@/lib/analytics/strength-generator";

export type BadgeTone = "good" | "warn" | "bad";

/** Serialized weekly narrative (stored as JSON string in `weekly_analyses.llm_weekly_analysis`). */
export interface LlmWeeklySectionsModel {
  wentWell: string;
  needsWork: string;
  nextWeek: string;
}

export interface WeeklyReportModel {
  weekRangeLabel: string;
  summary: {
    distanceKm: string;
    distanceMeta: string;
    sessions: number;
    sessionsMeta: string;
    totalTimeLabel: string;
    totalTimeMeta: string;
    loadWord: string;
    loadRatio: string | null;
    loadMeta: string;
    loadTone: BadgeTone;
  };
  intensity: {
    pctEasy: number;
    pctMod: number;
    pctHard: number;
    verdict: "good" | "warn" | "bad";
    observedMaxHr: number;
    /** Approximate easy ceiling HR used in copy (from athlete profile or derived). */
    z2CeilingHr?: number;
  };
  sessions: Array<{
    workoutId: string;
    dateShort: string;
    typeLabel: string;
    distanceLabel: string;
    hrLabel: string;
    statusLabel: string;
    tone: BadgeTone;
  }>;
  findings: Array<{
    severity: string;
    tone: "bad" | "warn" | "low";
    title: string;
    body: string;
    citations: { label: string; href: string }[];
    confidence: string;
    evidenceStrength?: string;
  }>;
  emptyWeek?: boolean;
  /** Present after server enrichment (cached LLM + validated session copy). */
  llm?: {
    weeklySections: LlmWeeklySectionsModel;
    intensityExplanation: string;
    sessionExplanations: Record<string, string>;
    /** Weekly narrative parsed from Haiku (vs rules-engine fallback). */
    weeklyNarrativeFromApi?: boolean;
    /** Set when ANTHROPIC_API_KEY is missing so the UI can explain static copy. */
    llmDisabledReason?: "no_api_key";
  };
  /** Rule-based strength session + scheduling (`weekly_analyses.strength_recommendation`). */
  strength?: StrengthRecommendationModel | null;
}
