import type { StrengthRecommendationModel } from "@/lib/analytics/strength-generator";

export interface TrendPoint {
  weekStart: string;
  distanceKm: number;
  acuteLoad: number;
  pctZone1_2: number;
}

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
  /** True when athlete.hr_rest is null — signals TRIMP uses HR-max-only approximation. */
  hrRestMissing?: boolean;
  /** True when athlete.goal_race_date is null — signals no taper recommendations available. */
  raceDateMissing?: boolean;
  /** Profile fields that are null — drives the completeness banner on dashboard + report. */
  missingProfileFields?: string[];
  /** Whether this athlete opted into experimental strength recommendations. */
  strengthOptIn?: boolean;
  /** UUID share_id from weekly_analyses — used for the /api/share/[shareId] endpoint. */
  shareId?: string;
  /** 8-week trend data for sparklines (undefined when insufficient history). */
  trend?: TrendPoint[];
  /** Present after server enrichment (cached LLM + validated session copy). */
  llm?: {
    weeklySections: LlmWeeklySectionsModel;
    intensityExplanation: string;
    sessionExplanations: Record<string, string>;
    /** Structured per-session fields (new regens only; absent on older rows). */
    sessionStructured?: Record<string, {
      observation?: string;
      comparison?: string;
      suggestion?: string;
      status_explanation?: string;
    }>;
    /** Weekly narrative parsed from Haiku (vs rules-engine fallback). */
    weeklyNarrativeFromApi?: boolean;
    /** Set when ANTHROPIC_API_KEY is missing so the UI can explain static copy. */
    llmDisabledReason?: "no_api_key";
  };
  /** Rule-based strength session + scheduling (`weekly_analyses.strength_recommendation`). */
  strength?: StrengthRecommendationModel | null;
}
