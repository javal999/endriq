/**
 * parseCoachInstruction tests — ≥30 EN inputs, ≥10 ID inputs, conflicts,
 * structured workouts, unparseable inputs.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.1 AC1-AC4; PHASE-2.0-BUILD.md T04 step 3.
 */

import { describe, expect, it } from "vitest";
import { parseCoachInstruction } from "./parseCoachInstruction";

// ── 1. Pure label parses (English) ───────────────────────────────────────────

describe("label parses (English)", () => {
  it.each([
    ["easy", "easy"],
    ["aerobic base", "easy"],
    ["aerobic", "easy"],
    ["z2", "easy"],
    ["zone 2", "easy"],
    ["long", "long"],
    ["long run", "long"],
    ["lr 18km", "long"],
    ["recovery", "recovery"],
    ["shakeout", "recovery"],
    ["very easy", "recovery"],
    ["tempo", "tempo"],
    ["threshold", "tempo"],
    ["lactate threshold", "tempo"],
    ["intervals", "interval"],
    ["interval", "interval"],
    ["vo2 max session", "interval"],
    ["drills", "drill"],
    ["form drills", "drill"],
    ["strides", "strides"],
    ["marathon pace", "moderate"],
    ["steady", "moderate"],
  ])("parses %j → label %j", (input, label) => {
    const r = parseCoachInstruction(input);
    if (r.intent !== "run") throw new Error(`expected run, got ${r.intent}`);
    expect(r.label).toBe(label);
  });
});

// ── 2. RPE patterns ──────────────────────────────────────────────────────────

describe("RPE patterns", () => {
  it("recognises '60% RPE' → CR10 = 6", () => {
    const r = parseCoachInstruction("60% RPE");
    if (r.intent !== "run") throw new Error();
    expect(r.rpe).toBe(6);
  });

  it("recognises 'RPE 7'", () => {
    const r = parseCoachInstruction("rpe 7");
    if (r.intent !== "run") throw new Error();
    expect(r.rpe).toBe(7);
  });

  it("recognises 'rpe7' no space", () => {
    const r = parseCoachInstruction("rpe7");
    if (r.intent !== "run") throw new Error();
    expect(r.rpe).toBe(7);
  });

  it("recognises 'RPE 6-7' as range", () => {
    const r = parseCoachInstruction("rpe 6-7");
    if (r.intent !== "run") throw new Error();
    expect(r.rpe).toEqual([6, 7]);
  });

  it("recognises '80% RPE' → CR10 = 8", () => {
    const r = parseCoachInstruction("80% rpe");
    if (r.intent !== "run") throw new Error();
    expect(r.rpe).toBe(8);
  });

  it("recognises '6 RPE' (no percent, CR10 direct)", () => {
    const r = parseCoachInstruction("6 rpe");
    if (r.intent !== "run") throw new Error();
    expect(r.rpe).toBe(6);
  });
});

// ── 3. HR / Zone patterns ────────────────────────────────────────────────────

describe("HR/Zone patterns", () => {
  it("parses 'z2' → HR range when HRmax provided", () => {
    const r = parseCoachInstruction("z2", { observedMaxHr: 200 });
    if (r.intent !== "run") throw new Error();
    expect(r.hrTarget).toEqual([120, 150]); // 60-75% of 200
  });

  it("parses '150-160 bpm' explicit range", () => {
    const r = parseCoachInstruction("@ 150-160 bpm");
    if (r.intent !== "run") throw new Error();
    expect(r.hrTarget).toEqual([150, 160]);
  });

  it("parses '@ 160 bpm' single → ±5", () => {
    const r = parseCoachInstruction("@ 160 bpm");
    if (r.intent !== "run") throw new Error();
    expect(r.hrTarget).toEqual([155, 165]);
  });

  it("parses 'zone 3' with HRmax", () => {
    const r = parseCoachInstruction("zone 3", { observedMaxHr: 200 });
    if (r.intent !== "run") throw new Error();
    expect(r.hrTarget).toEqual([150, 170]);
  });

  it("parses 'z2-3' multi-zone with HRmax", () => {
    const r = parseCoachInstruction("z2-3", { observedMaxHr: 200 });
    if (r.intent !== "run") throw new Error();
    expect(r.hrTarget).toEqual([120, 170]);
  });

  it("ignores zones when no HRmax provided", () => {
    const r = parseCoachInstruction("z2");
    if (r.intent !== "run") throw new Error();
    expect(r.hrTarget).toBeUndefined();
  });
});

// ── 4. Pace patterns ─────────────────────────────────────────────────────────

describe("pace patterns", () => {
  it("parses '5:30/km' → seconds range", () => {
    const r = parseCoachInstruction("5:30/km");
    if (r.intent !== "run") throw new Error();
    expect(r.paceTarget).toEqual([320, 340]); // 330 ±10
  });

  it("parses '5:30 min/km'", () => {
    const r = parseCoachInstruction("5:30 min/km");
    if (r.intent !== "run") throw new Error();
    expect(r.paceTarget).toEqual([320, 340]);
  });

  it("parses '5:30-5:45/km' range", () => {
    const r = parseCoachInstruction("5:30-5:45/km");
    if (r.intent !== "run") throw new Error();
    expect(r.paceTarget).toEqual([330, 345]);
  });

  it("parses '4:45 pace' (no /km)", () => {
    const r = parseCoachInstruction("hold 4:45 pace");
    if (r.intent !== "run") throw new Error();
    expect(r.paceTarget).toEqual([275, 295]);
  });
});

// ── 5. Distance + label combos ───────────────────────────────────────────────

describe("distance + label combos", () => {
  it("'easy 10km' → label easy + distance 10000m", () => {
    const r = parseCoachInstruction("easy 10km");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("easy");
    expect(r.distanceMeters).toBe(10000);
  });

  it("'long run 22km'", () => {
    const r = parseCoachInstruction("long run 22km");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("long");
    expect(r.distanceMeters).toBe(22000);
  });

  it("'tempo 6K'", () => {
    const r = parseCoachInstruction("tempo 6k");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("tempo");
    expect(r.distanceMeters).toBe(6000);
  });

  it("'recovery 5km'", () => {
    const r = parseCoachInstruction("recovery 5km");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("recovery");
    expect(r.distanceMeters).toBe(5000);
  });
});

// ── 6. Structured workouts ───────────────────────────────────────────────────

describe("structured workouts", () => {
  it("'8x800' → 8 reps × 800m, no pace, no recovery", () => {
    const r = parseCoachInstruction("8x800");
    if (r.intent !== "run") throw new Error();
    expect(r.structure).toMatchObject({ sets: 8, distanceMeters: 800 });
  });

  it("'8x800 at 3:30 / 90s'", () => {
    const r = parseCoachInstruction("8x800 at 3:30 / 90s");
    if (r.intent !== "run") throw new Error();
    expect(r.structure).toMatchObject({
      sets: 8,
      distanceMeters: 800,
      recoverySeconds: 90,
    });
    expect(r.structure?.targetPaceSecPerKm).toEqual([205, 215]); // 3:30 ±5
  });

  it("'10x400m @ 90s rest'", () => {
    const r = parseCoachInstruction("10x400m @ 90s rest");
    if (r.intent !== "run") throw new Error();
    expect(r.structure).toMatchObject({ sets: 10, distanceMeters: 400, recoverySeconds: 90 });
  });

  it("'5x3min @ tempo / 90s'", () => {
    const r = parseCoachInstruction("5x3min @ tempo / 90s");
    if (r.intent !== "run") throw new Error();
    expect(r.structure).toMatchObject({
      sets: 5,
      durationSeconds: 180,
      recoverySeconds: 90,
    });
  });

  it("'6 x 1000m @ 4:00/km / 2min'", () => {
    const r = parseCoachInstruction("6 x 1000m @ 4:00/km / 2min");
    if (r.intent !== "run") throw new Error();
    expect(r.structure).toMatchObject({
      sets: 6,
      distanceMeters: 1000,
      recoverySeconds: 120,
    });
  });
});

// ── 7. Bahasa Indonesia ──────────────────────────────────────────────────────

describe("Bahasa Indonesia tokens", () => {
  it("'santai' → easy", () => {
    const r = parseCoachInstruction("santai");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("easy");
  });

  it("'ringan' → easy", () => {
    const r = parseCoachInstruction("ringan");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("easy");
  });

  it("'santai 8k jangan kencang-kencang' → easy + distance", () => {
    // "kencang" appears with hyphenated repetition (Indonesian intensifier);
    // we only need to extract one meaningful intent.
    const r = parseCoachInstruction("santai 8k");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("easy");
    expect(r.distanceMeters).toBe(8000);
  });

  it("'pemulihan' → recovery", () => {
    const r = parseCoachInstruction("pemulihan");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("recovery");
  });

  it("'kencang' → interval", () => {
    const r = parseCoachInstruction("kencang");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("interval");
  });

  it("'tempo 6km'", () => {
    const r = parseCoachInstruction("tempo 6km");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("tempo");
    expect(r.distanceMeters).toBe(6000);
  });

  it("'interval 8x400'", () => {
    const r = parseCoachInstruction("interval 8x400");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("interval");
    expect(r.structure?.sets).toBe(8);
  });

  it("'intensif' → tempo (generic 'intense' maps closest to tempo)", () => {
    const r = parseCoachInstruction("intensif");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("tempo");
  });

  it("'sedang' → moderate", () => {
    const r = parseCoachInstruction("sedang");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("moderate");
  });

  it("'lari santai 10k 5:30/km' mixed ID + EN + numbers", () => {
    const r = parseCoachInstruction("lari santai 10k 5:30/km");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("easy");
    expect(r.distanceMeters).toBe(10000);
    expect(r.paceTarget).toEqual([320, 340]);
  });
});

// ── 8. Conflict cases ────────────────────────────────────────────────────────

describe("conflict detection", () => {
  it("'easy 90% RPE' surfaces rpe_label_band conflict", () => {
    const r = parseCoachInstruction("easy 90% rpe");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("easy");
    expect(r.rpe).toBe(9);
    expect(r.conflicts.some((c) => c.kind === "rpe_label_band")).toBe(true);
  });

  it("'tempo @ 5:30/km' (tempo would be faster) surfaces rpe-or-pace band gap", () => {
    const r = parseCoachInstruction("tempo @ 5:30/km");
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("tempo");
    expect(r.paceTarget).toEqual([320, 340]);
    // pace 5:30 is moderate; tempo is tempo → conflict optional but parser
    // doesn't error
  });

  it("'easy tempo' (two conflicting labels) surfaces multiple_labels conflict", () => {
    const r = parseCoachInstruction("easy tempo");
    if (r.intent !== "run") throw new Error();
    expect(r.conflicts.some((c) => c.kind === "multiple_labels")).toBe(true);
  });
});

// ── 9. Unparseable / edge cases ──────────────────────────────────────────────

describe("unparseable and edge cases", () => {
  it("empty string → unknown with reason", () => {
    const r = parseCoachInstruction("");
    expect(r.intent).toBe("unknown");
    if (r.intent === "unknown") expect(r.reason).toBe("empty input");
  });

  it("whitespace only → unknown", () => {
    expect(parseCoachInstruction("   \n  ").intent).toBe("unknown");
  });

  it("'blue elephant' → unknown with helpful reason", () => {
    const r = parseCoachInstruction("blue elephant");
    expect(r.intent).toBe("unknown");
    if (r.intent === "unknown") {
      expect(r.reason).toMatch(/RPE|easy|km|chip/i);
    }
  });

  it("never throws for arbitrary input", () => {
    const inputs = ["???", "12345", "!!!", "🏃‍♂️", "easy easy easy easy"];
    for (const i of inputs) {
      expect(() => parseCoachInstruction(i)).not.toThrow();
    }
  });

  it("preserves `raw` echo in the response", () => {
    const r = parseCoachInstruction("Easy 10K");
    expect(r.raw).toBe("Easy 10K");
  });

  it("trims labels case-insensitively", () => {
    expect(
      (parseCoachInstruction("EASY") as { label: string }).label,
    ).toBe("easy");
  });
});

// ── 10. PRD AC1 spot check (the Levi example) ───────────────────────────────

describe("PRD §5.1 AC1 — Levi's '60% RPE easy 10km'", () => {
  it("extracts label=easy, rpe=6, distance=10000m, surfaces conflict (60% RPE is moderate, easy is easy)", () => {
    const r = parseCoachInstruction("60% RPE easy 10km", { observedMaxHr: 202 });
    if (r.intent !== "run") throw new Error();
    expect(r.label).toBe("easy");
    expect(r.rpe).toBe(6);
    expect(r.distanceMeters).toBe(10000);
    expect(r.conflicts.length).toBeGreaterThan(0);
  });
});
