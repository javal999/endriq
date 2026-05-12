import type { SupabaseClient } from "@supabase/supabase-js";
import { generateWeeklyAnalysis } from "@/lib/analytics/weekly-analysis";
import type { WeeklyReportModel } from "@/lib/report/model";

/** Loads workouts, persists `weekly_analyses`, returns the HTML report model. */
export async function buildWeeklyReport(
  athleteId: string,
  weekStart: string,
  db: SupabaseClient,
): Promise<WeeklyReportModel> {
  const { model } = await generateWeeklyAnalysis(athleteId, weekStart, db);
  return model;
}
