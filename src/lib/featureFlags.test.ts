import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("featureFlags", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults all opt-in flags to false when env vars are unset", async () => {
    delete process.env.NEXT_PUBLIC_FF_COACH_VIEW;
    delete process.env.NEXT_PUBLIC_FF_PREDICTED_FINISH;
    delete process.env.NEXT_PUBLIC_FF_F8_CALIBRATION;
    delete process.env.NEXT_PUBLIC_FF_ROAST_DISABLED;

    const mod = await import("./featureFlags");
    expect(mod.flags.COACH_VIEW_PUBLIC).toBe(false);
    expect(mod.flags.PREDICTED_FINISH).toBe(false);
    expect(mod.flags.F8_PERSONAL_CALIBRATION).toBe(false);
    expect(mod.flags.ROAST_MODE).toBe(true);
  });

  it("reads the literal 'true' as on; everything else is off", async () => {
    process.env.NEXT_PUBLIC_FF_COACH_VIEW = "true";
    process.env.NEXT_PUBLIC_FF_PREDICTED_FINISH = "TRUE";
    process.env.NEXT_PUBLIC_FF_F8_CALIBRATION = "1";

    const mod = await import("./featureFlags");
    expect(mod.flags.COACH_VIEW_PUBLIC).toBe(true);
    expect(mod.flags.PREDICTED_FINISH).toBe(true);
    expect(mod.flags.F8_PERSONAL_CALIBRATION).toBe(false);
  });

  it("ROAST_MODE flips off when the disable flag is set", async () => {
    process.env.NEXT_PUBLIC_FF_ROAST_DISABLED = "true";
    const mod = await import("./featureFlags");
    expect(mod.flags.ROAST_MODE).toBe(false);
  });

  it("flags object is frozen — cannot mutate at runtime", async () => {
    const mod = await import("./featureFlags");
    expect(Object.isFrozen(mod.flags)).toBe(true);
  });

  it("flagDisabled throws FeatureDisabledError tagged with the flag", async () => {
    const { flagDisabled, FeatureDisabledError } = await import(
      "./featureFlags"
    );
    expect(() => flagDisabled("COACH_VIEW_PUBLIC")).toThrow(
      FeatureDisabledError,
    );
    try {
      flagDisabled("PREDICTED_FINISH");
    } catch (err) {
      expect((err as InstanceType<typeof FeatureDisabledError>).flag).toBe(
        "PREDICTED_FINISH",
      );
    }
  });
});
