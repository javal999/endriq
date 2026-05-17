/**
 * F10 augmentation overlay for the Phase 1.3 exercise library.
 *
 * Adds the four fields PRD §5.3 requires on each main-work row but the
 * Phase 1.3 Exercise shape didn't carry: tempo, cue, travel_variant_id,
 * warmup_or_main.
 *
 * Lives separately from exercise-library.ts to keep the original file
 * usable by Phase 1.3 code unchanged. F10's StrengthSessionDetail
 * consumes the merged view via `getExerciseDetail`.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.3 F10; PHASE-2.0-BUILD.md T09 step 2-3.
 */

import { EXERCISES, type Exercise } from "@/lib/data/exercise-library";

/**
 * Tempo convention (Daniels / Verkhoshansky): eccentric-pause-concentric-pause
 * in seconds. "2-1-1-0" = 2s lower, 1s bottom hold, 1s lift, no pause.
 * "X" denotes explosive.
 */
export interface ExerciseAugment {
  tempo: string;
  cue: string;
  /** Block where this exercise normally lands. Defaults to "main". */
  block?: "warmup" | "main" | "cooldown" | "post_session";
  /** id of the bodyweight/band variant for Travel Mode; null if none. */
  travel_variant_id: string | null;
}

export const EXERCISE_AUGMENTS: Record<string, ExerciseAugment> = {
  // ── Lower-body strength (main) ───────────────────────────────────────────
  back_squat: {
    tempo: "3-1-1-0",
    cue: "Knees track over toes. Chest stays tall through the bottom.",
    travel_variant_id: "bodyweight_pistol_squat",
    block: "main",
  },
  bulgarian_split_squat: {
    tempo: "2-1-1-0",
    cue: "Front shin vertical; weight through the front heel.",
    travel_variant_id: "bulgarian_split_squat_bw",
    block: "main",
  },
  single_leg_deadlift: {
    tempo: "3-0-1-0",
    cue: "Hinge from the hip; back stays flat. Don't reach for the floor.",
    travel_variant_id: "single_leg_deadlift_bw",
    block: "main",
  },
  step_up: {
    tempo: "2-0-1-0",
    cue: "Drive through the top heel; don't push off the trailing leg.",
    travel_variant_id: null,
    block: "main",
  },
  romanian_deadlift: {
    tempo: "3-1-1-0",
    cue: "Hips travel back, not down. Lats stay engaged the whole rep.",
    travel_variant_id: "single_leg_deadlift_bw",
    block: "main",
  },
  calf_raise: {
    tempo: "3-2-1-0",
    cue: "Pause at the top; lower slowly through the full range.",
    travel_variant_id: "calf_raise_bw",
    block: "main",
  },
  nordic_hamstring: {
    tempo: "5-0-X-0",
    cue: "Resist the fall as long as possible; catch with your hands when you can't hold.",
    travel_variant_id: null,
    block: "main",
  },

  // ── Plyometric (main) ────────────────────────────────────────────────────
  box_jump: {
    tempo: "X-0-X-0",
    cue: "Step down, never jump down. Quality over height.",
    travel_variant_id: "pogo_hops",
    block: "main",
  },
  bounding: {
    tempo: "X-0-X-0",
    cue: "Cover ground with each stride; arms drive forward, not across.",
    travel_variant_id: null,
    block: "main",
  },
  pogo_hops: {
    tempo: "X-0-X-0",
    cue: "Quiet feet; ankles do the work, not the knees.",
    travel_variant_id: null,
    block: "main",
  },

  // ── Core (main / accessory) ──────────────────────────────────────────────
  dead_bug: {
    tempo: "2-0-2-0",
    cue: "Low back stays glued to the floor; ribs down.",
    travel_variant_id: null,
    block: "main",
  },
  pallof_press: {
    tempo: "2-1-2-0",
    cue: "Resist the rotation; don't let your hips drift.",
    travel_variant_id: "pallof_press",
    block: "main",
  },
  side_plank: {
    tempo: "hold",
    cue: "Stack hips; don't let the bottom one sag.",
    travel_variant_id: null,
    block: "main",
  },
  copenhagen_plank: {
    tempo: "hold",
    cue: "Squeeze the top knee toward the bench through the whole hold.",
    travel_variant_id: null,
    block: "main",
  },

  // ── Warmup / mobility ────────────────────────────────────────────────────
  bodyweight_squat: {
    tempo: "2-0-1-0",
    cue: "Feet shoulder-width; sit between your hips.",
    travel_variant_id: null,
    block: "warmup",
  },
  hip_flexor_stretch: {
    tempo: "hold",
    cue: "Tuck the pelvis; you should feel the front of the back-leg hip.",
    travel_variant_id: null,
    block: "warmup",
  },
  ankle_mobility: {
    tempo: "2-0-2-0",
    cue: "Drive the knee forward over the toes without lifting the heel.",
    travel_variant_id: null,
    block: "warmup",
  },

  // ── Cooldown / post-session ──────────────────────────────────────────────
  foam_roll_quads: {
    tempo: "slow",
    cue: "Pause on tender spots for ~20s; don't roll through sharp pain.",
    travel_variant_id: null,
    block: "cooldown",
  },
  cat_camel: {
    tempo: "3-0-3-0",
    cue: "Move through the full range; let the breath cue the rhythm.",
    travel_variant_id: null,
    block: "cooldown",
  },
};

// ── Bodyweight / travel variants ────────────────────────────────────────────
// These are *additional* exercises not in the Phase 1.3 EXERCISES list.
// StrengthSessionDetail looks them up by id when Travel Mode is on.
export const TRAVEL_VARIANT_EXERCISES: Exercise[] = [
  {
    id: "bodyweight_pistol_squat",
    name: "Bodyweight pistol squat (assisted as needed)",
    emphasis: ["single_leg_economy"],
    sets_reps: "3 × 5–8 each leg",
    rest_seconds: 90,
    rpe_target: "7",
    impact: "Single-leg strength without external load — strong enough for hotel rooms.",
    citation_id: "blagrove_2018",
    demo_url: "https://www.youtube.com/results?search_query=pistol+squat+progression",
  },
  {
    id: "bulgarian_split_squat_bw",
    name: "Bulgarian split squat (bodyweight)",
    emphasis: ["single_leg_economy"],
    sets_reps: "3 × 10–12 each leg",
    rest_seconds: 60,
    rpe_target: "7",
    impact: "Same movement, lower load — keeps the pattern alive on the road.",
    citation_id: "blagrove_2018",
    demo_url: "https://www.youtube.com/results?search_query=bulgarian+split+squat+bodyweight",
  },
  {
    id: "single_leg_deadlift_bw",
    name: "Single-leg deadlift (bodyweight)",
    emphasis: ["posterior_chain"],
    sets_reps: "3 × 10 each leg",
    rest_seconds: 60,
    rpe_target: "6",
    impact: "Balance + hinge pattern; load with a backpack if available.",
    citation_id: "beattie_2017",
    demo_url: "https://www.youtube.com/results?search_query=single+leg+deadlift+bodyweight",
  },
  {
    id: "calf_raise_bw",
    name: "Calf raise (bodyweight, single-leg)",
    emphasis: ["posterior_chain", "maintenance"],
    sets_reps: "3 × 15 each leg",
    rest_seconds: 45,
    rpe_target: "7",
    impact: "Hotel-room friendly version that still overloads the calf.",
    citation_id: "mahieu_2006",
    demo_url: "https://www.youtube.com/results?search_query=single+leg+calf+raise",
  },
];

const TRAVEL_VARIANTS_BY_ID = new Map(
  TRAVEL_VARIANT_EXERCISES.map((e) => [e.id, e]),
);

/**
 * Returns an Exercise by id, drawing from the Phase 1.3 library OR the
 * Phase 2.0 travel-variant list. Used by StrengthSessionDetail.
 */
export function getExerciseById(id: string): Exercise | null {
  return EXERCISES.find((e) => e.id === id) ?? TRAVEL_VARIANTS_BY_ID.get(id) ?? null;
}

/**
 * Merged detail row used by the F10 UI. Combines the Phase 1.3 fields with
 * the T09 augmentation. Defaults applied when no augment exists.
 */
export interface ExerciseDetail extends Exercise {
  tempo: string;
  cue: string;
  block: "warmup" | "main" | "cooldown" | "post_session";
  travel_variant_id: string | null;
}

const DEFAULT_AUGMENT: ExerciseAugment = {
  tempo: "2-1-1-0",
  cue: "",
  travel_variant_id: null,
  block: "main",
};

export function getExerciseDetail(id: string): ExerciseDetail | null {
  const base = getExerciseById(id);
  if (!base) return null;
  const aug = EXERCISE_AUGMENTS[id] ?? DEFAULT_AUGMENT;
  return {
    ...base,
    tempo: aug.tempo,
    cue: aug.cue,
    block: aug.block ?? "main",
    travel_variant_id: aug.travel_variant_id ?? null,
  };
}

/**
 * Returns the travel-mode replacement for the given exercise id, OR null if
 * no replacement exists (in which case the caller should drop the exercise
 * from the menu rather than render it without a variant).
 */
export function getTravelVariantDetail(id: string): ExerciseDetail | null {
  const aug = EXERCISE_AUGMENTS[id];
  if (!aug?.travel_variant_id) return null;
  return getExerciseDetail(aug.travel_variant_id);
}
