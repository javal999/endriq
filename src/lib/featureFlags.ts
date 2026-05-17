/**
 * Phase 2.0 feature flags.
 *
 * Env-var driven, evaluated once at module load. Defaults are OFF so a fresh
 * deploy never accidentally exposes an in-flight feature. UI surfaces gate
 * on these flags and render their empty / coming-soon state when disabled —
 * never an error.
 *
 * To enable a flag in production: set the corresponding NEXT_PUBLIC_FF_*
 * env var to the literal string "true" in Vercel project settings, then
 * redeploy.
 *
 * Refs: PHASE-2.0-ARCHITECTURE.md §5.4 (A10); PHASE-2.0-BUILD.md T01.
 */

function envFlag(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export const flags = Object.freeze({
  /** F13 — public coach view route at /coach/[uuid]. */
  COACH_VIEW_PUBLIC: envFlag("NEXT_PUBLIC_FF_COACH_VIEW"),
  /** F14.B — predicted finish range on /race. */
  PREDICTED_FINISH: envFlag("NEXT_PUBLIC_FF_PREDICTED_FINISH"),
  /** F8.4 — narrow HR ranges using the athlete's observed history. */
  F8_PERSONAL_CALIBRATION: envFlag("NEXT_PUBLIC_FF_F8_CALIBRATION"),
  /**
   * Shipped in Phase 1.3; kept here for emergency disable via env override.
   * Set NEXT_PUBLIC_FF_ROAST_DISABLED=true to force-off without a code change.
   */
  ROAST_MODE: !envFlag("NEXT_PUBLIC_FF_ROAST_DISABLED"),
} as const);

export type FeatureFlag = keyof typeof flags;

export class FeatureDisabledError extends Error {
  constructor(public readonly flag: FeatureFlag) {
    super(`Feature ${flag} is disabled`);
    this.name = "FeatureDisabledError";
  }
}

/** Throws FeatureDisabledError. Useful in code paths that must hard-stop. */
export function flagDisabled(flag: FeatureFlag): never {
  throw new FeatureDisabledError(flag);
}
