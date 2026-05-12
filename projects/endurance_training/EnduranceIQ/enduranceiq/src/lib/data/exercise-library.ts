/**
 * Session templates for the Phase 1 strength generator — aligned with
 * EnduranceIQ_Platform_Architecture_v2.1.md Part 4.
 */

export interface Exercise {
  name: string;
  sets: string;
  rest: string;
  rpe: string;
  impact: string;
  evidenceDoi: string | null;
  evidenceLabel: string | null;
  demoUrl: string;
}

export interface SessionTemplate {
  id: "A" | "B" | "C";
  name: string;
  duration: string;
  exercises: Exercise[];
}

export const SESSION_A: SessionTemplate = {
  id: "A",
  name: "Lower body — strength + injury prevention",
  duration: "45–55 min",
  exercises: [
    {
      name: "Back squat",
      sets: "3 × 6–8",
      rest: "3 min",
      rpe: "7–8",
      impact:
        "Improved running economy by 2–4% over 8 weeks in trained runners.",
      evidenceDoi: "10.1519/JSC.0000000000002200",
      evidenceLabel: "Beattie et al. (2017)",
      demoUrl:
        "https://www.youtube.com/results?search_query=barbell+back+squat+proper+form",
    },
    {
      name: "Romanian deadlift",
      sets: "3 × 8–10",
      rest: "2 min",
      rpe: "7",
      impact: "Posterior chain strength reduces hamstring injury risk.",
      evidenceDoi: "10.1136/bjsports-2016-097237",
      evidenceLabel: "Bourne et al. (2017)",
      demoUrl:
        "https://www.youtube.com/results?search_query=romanian+deadlift+tutorial",
    },
    {
      name: "Bulgarian split squat",
      sets: "3 × 8 each leg",
      rest: "90s",
      rpe: "7",
      impact:
        "Single-leg strength addresses bilateral imbalances common in runners.",
      evidenceDoi: "10.1007/s40279-017-0802-z",
      evidenceLabel: "Blagrove et al. (2018)",
      demoUrl:
        "https://www.youtube.com/results?search_query=bulgarian+split+squat+form",
    },
    {
      name: "Calf raise (standing)",
      sets: "3 × 12–15",
      rest: "60s",
      rpe: "6–7",
      impact: "Achilles tendon loading reduces tendinopathy risk.",
      evidenceDoi: "10.1177/0363546505282073",
      evidenceLabel: "Mahieu et al. (2006)",
      demoUrl:
        "https://www.youtube.com/results?search_query=standing+calf+raise+form",
    },
    {
      name: "Copenhagen plank",
      sets: "3 × 20s each side",
      rest: "60s",
      rpe: "6–7",
      impact:
        "Groin injury prevention — large reduction in adductor injuries in RCT.",
      evidenceDoi: "10.1136/bjsports-2017-098937",
      evidenceLabel: "Harøy et al. (2019)",
      demoUrl:
        "https://www.youtube.com/results?search_query=copenhagen+plank+exercise",
    },
  ],
};

export const SESSION_B: SessionTemplate = {
  id: "B",
  name: "Upper body + core — posture + stability",
  duration: "35–45 min",
  exercises: [
    {
      name: "Pull-up or lat pulldown",
      sets: "3 × 8–10",
      rest: "2 min",
      rpe: "7",
      impact:
        "Upper-back strength supports posture in late-race fatigue.",
      evidenceDoi: "10.1007/s40279-017-0802-z",
      evidenceLabel: "Blagrove et al. (2018)",
      demoUrl:
        "https://www.youtube.com/results?search_query=pull+up+or+lat+pulldown+tutorial",
    },
    {
      name: "Dumbbell row",
      sets: "3 × 10 each arm",
      rest: "90s",
      rpe: "6–7",
      impact: "Anti-rotation demand trains core stability during pulling.",
      evidenceDoi: "10.1007/s40279-017-0802-z",
      evidenceLabel: "Blagrove et al. (2018)",
      demoUrl:
        "https://www.youtube.com/results?search_query=single+arm+dumbbell+row+form",
    },
    {
      name: "Push-up",
      sets: "3 × 12–15",
      rest: "60s",
      rpe: "6",
      impact:
        "Shoulder stability and arm drive support running mechanics.",
      evidenceDoi: null,
      evidenceLabel: null,
      demoUrl:
        "https://www.youtube.com/results?search_query=push+up+proper+form",
    },
    {
      name: "Pallof press",
      sets: "3 × 10 each side",
      rest: "60s",
      rpe: "6",
      impact:
        "Anti-rotation core — more running-specific than sagittal crunches.",
      evidenceDoi: null,
      evidenceLabel: null,
      demoUrl:
        "https://www.youtube.com/results?search_query=pallof+press+exercise",
    },
    {
      name: "Dead bug",
      sets: "3 × 8 each side",
      rest: "60s",
      rpe: "5–6",
      impact:
        "Core stability under contralateral load — similar demand to running.",
      evidenceDoi: null,
      evidenceLabel: null,
      demoUrl:
        "https://www.youtube.com/results?search_query=dead+bug+exercise+form",
    },
    {
      name: "Side plank",
      sets: "3 × 30s each side",
      rest: "45s",
      rpe: "6",
      impact:
        "Lateral hip/core stability supports knee and IT-band resilience.",
      evidenceDoi: null,
      evidenceLabel: null,
      demoUrl:
        "https://www.youtube.com/results?search_query=side+plank+proper+form",
    },
  ],
};

export const SESSION_C: SessionTemplate = {
  id: "C",
  name: "Maintenance — pre-race or high-load weeks",
  duration: "25–30 min",
  exercises: [
    {
      name: "Bodyweight squat",
      sets: "2 × 15",
      rest: "60s",
      rpe: "5",
      impact: "Maintain movement pattern without heavy loading.",
      evidenceDoi: null,
      evidenceLabel: null,
      demoUrl:
        "https://www.youtube.com/results?search_query=bodyweight+squat+form",
    },
    {
      name: "Calf raise",
      sets: "2 × 15",
      rest: "60s",
      rpe: "5–6",
      impact: "Maintain Achilles tendon loading.",
      evidenceDoi: "10.1177/0363546505282073",
      evidenceLabel: "Mahieu et al. (2006)",
      demoUrl:
        "https://www.youtube.com/results?search_query=standing+calf+raise+form",
    },
    {
      name: "Dead bug",
      sets: "2 × 8 each side",
      rest: "45s",
      rpe: "5",
      impact: "Maintain trunk stability.",
      evidenceDoi: null,
      evidenceLabel: null,
      demoUrl:
        "https://www.youtube.com/results?search_query=dead+bug+exercise+form",
    },
    {
      name: "Copenhagen plank",
      sets: "2 × 15s each side",
      rest: "45s",
      rpe: "5–6",
      impact: "Maintain groin resilience stimulus.",
      evidenceDoi: "10.1136/bjsports-2017-098937",
      evidenceLabel: "Harøy et al. (2019)",
      demoUrl:
        "https://www.youtube.com/results?search_query=copenhagen+plank+exercise",
    },
  ],
};

const BY_ID: Record<SessionTemplate["id"], SessionTemplate> = {
  A: SESSION_A,
  B: SESSION_B,
  C: SESSION_C,
};

export function getSessionTemplate(id: SessionTemplate["id"]): SessionTemplate {
  return BY_ID[id];
}
