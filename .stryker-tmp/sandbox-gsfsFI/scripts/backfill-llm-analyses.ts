/**
 * Backfills `weekly_analyses.llm_*` by re-running `generateWeeklyAnalysis`.
 *
 * Fill missing LLM columns only (default):
 *   export ANTHROPIC_API_KEY=...
 *   npx tsx scripts/backfill-llm-analyses.ts [athleteUuid]
 *
 * Regenerate every stored week (forces Haiku + overwrites cache):
 *   ENDURANCEIQ_FORCE_LLM=1 npx tsx scripts/backfill-llm-analyses.ts [athleteUuid]
 */
// @ts-nocheck


import { generateWeeklyAnalysis } from "@/lib/analytics/weekly-analysis";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_SEED = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function main() {
  const athleteId =
    process.argv[2]?.trim() ||
    process.env.ENDURANCEIQ_ATHLETE_ID?.trim() ||
    DEFAULT_SEED;

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error("ANTHROPIC_API_KEY is required for LLM backfill.");
    process.exit(1);
  }

  const forceAll = process.env.ENDURANCEIQ_FORCE_LLM === "1";
  const delayMs = Number(
    process.env.ENDURANCEIQ_BACKFILL_DELAY_MS?.trim() ||
      (forceAll ? "1000" : "400"),
  );

  const admin = createAdminClient();
  let q = admin
    .from("weekly_analyses")
    .select("week_start")
    .eq("athlete_id", athleteId)
    .order("week_start", { ascending: true });

  if (!forceAll) {
    q = q.is("llm_weekly_analysis", null);
  }

  const { data: rows, error } = await q;

  if (error) throw error;
  const weeks = (rows ?? []).map((r) => String(r.week_start).slice(0, 10));

  if (!weeks.length) {
    console.error(
      forceAll
        ? `No weekly_analyses rows for athlete: ${athleteId}`
        : `No rows missing llm_weekly_analysis for ${athleteId}. Set ENDURANCEIQ_FORCE_LLM=1 to regenerate all weeks.`,
    );
    process.exit(1);
  }

  console.log(
    `${forceAll ? "Regenerate all" : "Fill missing"} — ${weeks.length} week(s) for ${athleteId} (delay ${delayMs}ms)`,
  );

  for (const weekStart of weeks) {
    process.stdout.write(`${weekStart} … `);
    await generateWeeklyAnalysis(athleteId, weekStart);
    console.log("ok");
    await sleep(delayMs);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
