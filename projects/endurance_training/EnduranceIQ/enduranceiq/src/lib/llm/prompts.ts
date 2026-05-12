import type { LlmWeeklyBundle } from "@/lib/llm/types";

const ALLOWED_GOAL_RACE_TYPES = new Set([
  "marathon",
  "half_marathon",
  "10k",
  "5k",
  "ultramarathon",
  "general_fitness",
  "other",
]);

function safeGoalRaceType(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  const normalized = raw.trim().toLowerCase().replace(/[\s-]/g, "_");
  return ALLOWED_GOAL_RACE_TYPES.has(normalized) ? normalized : "unknown";
}

const SYSTEM_COACH =
  "You are EnduranceIQ, a conservative endurance coaching assistant. " +
  "You only interpret structured training metrics supplied by the user message. " +
  "Do not invent workouts, paces, prescriptions, or medical advice. " +
  "Use evidence-informed language; acknowledge uncertainty. " +
  "Never tell the athlete exactly what they must run tomorrow.";

export function weeklyUserPrompt(b: LlmWeeklyBundle): string {
  return [
    "Using ONLY the structured facts below (no external assumptions), write three short sections.",
    "",
    "Return ONLY valid JSON with keys: went_well, needs_work, next_week (each a single paragraph string, plain text).",
    "",
    "Athlete context:",
    `- goal_race_type: ${safeGoalRaceType(b.goalRaceType)}`,
    `- goal_race_date: ${b.goalRaceDate ?? "unknown"}`,
    `- goal_weekly_km: ${b.goalWeeklyKm ?? "unknown"}`,
    `- weeks_of_history_approx: ${b.weeksOfDataApprox}`,
    "",
    "Week aggregates:",
    `- total_distance_km: ${b.totalDistanceKm.toFixed(1)}`,
    `- prev_week_distance_km: ${b.prevWeekDistanceKm.toFixed(1)}`,
    `- month_avg_distance_km: ${b.monthAvgDistanceKm.toFixed(1)}`,
    `- running_sessions: ${b.runningSessions}`,
    `- strength_sessions: ${b.strengthSessions}`,
    `- total_time_minutes: ${b.totalTimeMinutes}`,
    `- intensity_easy_pct: ${b.pctEasy}`,
    `- intensity_moderate_pct: ${b.pctModerate}`,
    `- intensity_hard_pct: ${b.pctHard}`,
    `- load_ratio: ${b.loadRatio ?? "unknown"}`,
    `- load_word: ${b.loadStatusWord}`,
    `- observed_max_hr: ${b.maxHr}`,
    `- estimated_easy_ceiling_hr: ${b.z2Ceiling}`,
    `- avg_easy_run_hr: ${b.avgEasyRunHr ?? "unknown"}`,
    `- strength_run_interference_flag: ${b.interferenceDetected}`,
    b.interferenceSnippet
      ? `- interference_note: ${b.interferenceSnippet}`
      : "",
    "",
    "Session ledger (no titles; metrics only):",
    b.sessionsText || "(none)",
    "",
    "Rule findings (titles + summaries):",
    b.findingsText || "(none)",
  ]
    .filter(Boolean)
    .join("\n");
}

export function intensityUserPrompt(b: LlmWeeklyBundle): string {
  return [
    "Explain this week's HR-based intensity mix in 2–4 sentences for an educated amateur runner.",
    "Tie the interpretation to the athlete goal context when relevant (marathon vs general fitness vs other).",
    "Reference the easy/moderate/hard percentages and load_word only from data below.",
    "Do not prescribe workouts or paces. Plain text only, no JSON.",
    "",
    `goal_race_type=${safeGoalRaceType(b.goalRaceType)}`,
    `goal_race_date=${b.goalRaceDate ?? "unknown"}`,
    `goal_weekly_km=${b.goalWeeklyKm ?? "unknown"}`,
    `easy_pct=${b.pctEasy} moderate_pct=${b.pctModerate} hard_pct=${b.pctHard}`,
    `load_ratio=${b.loadRatio ?? "unknown"} load_word=${b.loadStatusWord}`,
    `observed_max_hr=${b.maxHr} estimated_easy_ceiling_hr=${b.z2Ceiling}`,
    `avg_easy_run_hr=${b.avgEasyRunHr ?? "unknown"}`,
    `weeks_of_history_approx=${b.weeksOfDataApprox}`,
  ].join("\n");
}

export function sessionsUserPrompt(b: LlmWeeklyBundle): string {
  return [
    "Here is JSON describing each workout row id and its computed status label.",
    "Return ONLY a JSON array. Each element: {\"workout_id\": \"<uuid>\", \"explanation\": \"...\"}",
    "Cover every workout_id exactly once. One short paragraph per workout.",
    "Do not prescribe training plans or next workouts.",
    "",
    b.sessionLedgerJson,
  ].join("\n");
}

export { SYSTEM_COACH };
