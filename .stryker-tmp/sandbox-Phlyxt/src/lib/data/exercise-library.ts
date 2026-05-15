/**
 * Exercise bank for Strength v2 — exercises tagged by emphasis rather than A/B/C templates.
 * The menu generator selects exercises by emphasis tag based on the detected running pattern.
 */
// @ts-nocheck


import type { CitationId } from "@/lib/data/citations";

export type ExerciseEmphasis =
  | "single_leg_economy"
  | "posterior_chain"
  | "plyometric"
  | "core_stability"
  | "maintenance"
  | "mobility";

export interface Exercise {
  id: string;
  name: string;
  emphasis: ExerciseEmphasis[];
  sets_reps: string;
  rest_seconds: number;
  rpe_target: string;
  impact: string;
  citation_id: CitationId | null;
  demo_url: string;
}

export const EXERCISES: Exercise[] = [
  // ── Single-leg economy ──────────────────────────────────────────────────────
  {
    id: "back_squat",
    name: "Back squat",
    emphasis: ["single_leg_economy", "posterior_chain"],
    sets_reps: "3 × 6–8",
    rest_seconds: 180,
    rpe_target: "7–8",
    impact: "Improved running economy by 2–4% over 8 weeks in trained runners.",
    citation_id: "beattie_2017",
    demo_url: "https://www.youtube.com/results?search_query=barbell+back+squat+proper+form",
  },
  {
    id: "bulgarian_split_squat",
    name: "Bulgarian split squat",
    emphasis: ["single_leg_economy"],
    sets_reps: "3 × 8 each leg",
    rest_seconds: 90,
    rpe_target: "7",
    impact: "Single-leg strength addresses bilateral imbalances common in runners.",
    citation_id: "blagrove_2018",
    demo_url: "https://www.youtube.com/results?search_query=bulgarian+split+squat+form",
  },
  {
    id: "single_leg_deadlift",
    name: "Single-leg deadlift",
    emphasis: ["single_leg_economy", "posterior_chain"],
    sets_reps: "3 × 8 each leg",
    rest_seconds: 90,
    rpe_target: "6–7",
    impact: "Single-leg hip hinge trains the stance-phase mechanics of running.",
    citation_id: "beattie_2017",
    demo_url: "https://www.youtube.com/results?search_query=single+leg+deadlift+form",
  },
  {
    id: "step_up",
    name: "Step-up",
    emphasis: ["single_leg_economy"],
    sets_reps: "3 × 10 each leg",
    rest_seconds: 60,
    rpe_target: "6",
    impact: "Unilateral loading patterns transfer directly to running mechanics.",
    citation_id: "blagrove_2018",
    demo_url: "https://www.youtube.com/results?search_query=step+up+exercise+form",
  },

  // ── Posterior chain ──────────────────────────────────────────────────────────
  {
    id: "romanian_deadlift",
    name: "Romanian deadlift",
    emphasis: ["posterior_chain"],
    sets_reps: "3 × 8–10",
    rest_seconds: 120,
    rpe_target: "7",
    impact: "Posterior chain strength reduces hamstring injury risk.",
    citation_id: "bourne_2017",
    demo_url: "https://www.youtube.com/results?search_query=romanian+deadlift+tutorial",
  },
  {
    id: "calf_raise",
    name: "Calf raise (standing)",
    emphasis: ["posterior_chain", "maintenance"],
    sets_reps: "3 × 12–15",
    rest_seconds: 60,
    rpe_target: "6–7",
    impact: "Achilles tendon loading reduces tendinopathy risk.",
    citation_id: "mahieu_2006",
    demo_url: "https://www.youtube.com/results?search_query=standing+calf+raise+form",
  },
  {
    id: "nordic_hamstring",
    name: "Nordic hamstring curl",
    emphasis: ["posterior_chain"],
    sets_reps: "3 × 6–8",
    rest_seconds: 120,
    rpe_target: "7–8",
    impact: "Eccentric hamstring strength markedly reduces injury risk.",
    citation_id: "bourne_2017",
    demo_url: "https://www.youtube.com/results?search_query=nordic+hamstring+curl+form",
  },

  // ── Plyometric ───────────────────────────────────────────────────────────────
  {
    id: "box_jump",
    name: "Box jump",
    emphasis: ["plyometric"],
    sets_reps: "4 × 6",
    rest_seconds: 120,
    rpe_target: "7–8",
    impact: "Improves ground contact time and neuromuscular drive — key for cadence.",
    citation_id: "saunders_2006",
    demo_url: "https://www.youtube.com/results?search_query=box+jump+proper+form",
  },
  {
    id: "bounding",
    name: "Bounding (single-leg hops)",
    emphasis: ["plyometric"],
    sets_reps: "3 × 20 m",
    rest_seconds: 90,
    rpe_target: "7",
    impact: "Develops stride power and improves cadence through faster ground contact.",
    citation_id: "saunders_2006",
    demo_url: "https://www.youtube.com/results?search_query=bounding+running+drill",
  },
  {
    id: "pogo_hops",
    name: "Pogo hops",
    emphasis: ["plyometric"],
    sets_reps: "3 × 20 reps",
    rest_seconds: 60,
    rpe_target: "6–7",
    impact: "Ankle stiffness drills that translate to faster turnover at low impact.",
    citation_id: "saunders_2006",
    demo_url: "https://www.youtube.com/results?search_query=pogo+hops+drill",
  },

  // ── Core stability ───────────────────────────────────────────────────────────
  {
    id: "dead_bug",
    name: "Dead bug",
    emphasis: ["core_stability", "maintenance"],
    sets_reps: "3 × 8 each side",
    rest_seconds: 60,
    rpe_target: "5–6",
    impact: "Core stability under contralateral load — mirrors running mechanics.",
    citation_id: null,
    demo_url: "https://www.youtube.com/results?search_query=dead+bug+exercise+form",
  },
  {
    id: "pallof_press",
    name: "Pallof press",
    emphasis: ["core_stability"],
    sets_reps: "3 × 10 each side",
    rest_seconds: 60,
    rpe_target: "6",
    impact: "Anti-rotation core training — more running-specific than sagittal crunches.",
    citation_id: null,
    demo_url: "https://www.youtube.com/results?search_query=pallof+press+exercise",
  },
  {
    id: "side_plank",
    name: "Side plank",
    emphasis: ["core_stability"],
    sets_reps: "3 × 30s each side",
    rest_seconds: 45,
    rpe_target: "6",
    impact: "Lateral hip/core stability supports knee and IT-band resilience.",
    citation_id: null,
    demo_url: "https://www.youtube.com/results?search_query=side+plank+proper+form",
  },
  {
    id: "copenhagen_plank",
    name: "Copenhagen plank",
    emphasis: ["core_stability", "maintenance"],
    sets_reps: "3 × 20s each side",
    rest_seconds: 60,
    rpe_target: "6–7",
    impact: "Groin injury prevention — large reduction in adductor injuries in RCT.",
    citation_id: "haroy_2019",
    demo_url: "https://www.youtube.com/results?search_query=copenhagen+plank+exercise",
  },

  // ── Maintenance ──────────────────────────────────────────────────────────────
  {
    id: "bodyweight_squat",
    name: "Bodyweight squat",
    emphasis: ["maintenance"],
    sets_reps: "2 × 15",
    rest_seconds: 60,
    rpe_target: "5",
    impact: "Maintain movement pattern without heavy loading.",
    citation_id: null,
    demo_url: "https://www.youtube.com/results?search_query=bodyweight+squat+form",
  },

  // ── Mobility ─────────────────────────────────────────────────────────────────
  {
    id: "hip_flexor_stretch",
    name: "Hip flexor stretch (kneeling)",
    emphasis: ["mobility"],
    sets_reps: "3 × 60s each side",
    rest_seconds: 30,
    rpe_target: "4–5",
    impact: "Restores hip extension range — reduced when training load is high.",
    citation_id: null,
    demo_url: "https://www.youtube.com/results?search_query=kneeling+hip+flexor+stretch",
  },
  {
    id: "ankle_mobility",
    name: "Ankle mobility drill (wall)",
    emphasis: ["mobility"],
    sets_reps: "2 × 15 each side",
    rest_seconds: 30,
    rpe_target: "4",
    impact: "Ankle dorsiflexion range improves foot contact mechanics.",
    citation_id: null,
    demo_url: "https://www.youtube.com/results?search_query=ankle+mobility+wall+drill",
  },
  {
    id: "foam_roll_quads",
    name: "Foam roll (quads + ITB)",
    emphasis: ["mobility"],
    sets_reps: "2 × 60s each side",
    rest_seconds: 30,
    rpe_target: "4–5",
    impact: "Soft tissue maintenance during high-load or interference windows.",
    citation_id: null,
    demo_url: "https://www.youtube.com/results?search_query=foam+rolling+quads+itb",
  },
  {
    id: "cat_camel",
    name: "Cat-camel spinal mobility",
    emphasis: ["mobility", "core_stability"],
    sets_reps: "2 × 10",
    rest_seconds: 30,
    rpe_target: "3–4",
    impact: "Restores spinal mobility and activates core at low intensity.",
    citation_id: null,
    demo_url: "https://www.youtube.com/results?search_query=cat+camel+stretch",
  },

  // ── Upper body / posture ─────────────────────────────────────────────────────
  {
    id: "pullup_lat_pulldown",
    name: "Pull-up or lat pulldown",
    emphasis: ["core_stability"],
    sets_reps: "3 × 8–10",
    rest_seconds: 120,
    rpe_target: "7",
    impact: "Upper-back strength supports posture in late-race fatigue.",
    citation_id: "blagrove_2018",
    demo_url: "https://www.youtube.com/results?search_query=pull+up+or+lat+pulldown+tutorial",
  },
];

/** Get all exercises matching any of the given emphasis tags. */
export function getExercisesByEmphasis(tags: ExerciseEmphasis[]): Exercise[] {
  const tagSet = new Set(tags);
  return EXERCISES.filter((e) => e.emphasis.some((t) => tagSet.has(t)));
}
