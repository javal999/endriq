/** Patterns that reject output outright (medical / prescription tone). */
const BLOCK_PATTERNS: RegExp[] = [
  /\bdiagnos/i,
  /\bprescri/i,
  /\byou must stop/i,
  /\bmedical condition/i,
  /\bdisease/i,
  /\bstop training/i,
  /\bstop exercising/i,
  /\bstop running/i,
  /\bseek immediate/i,
  /\bcall your doctor/i,
  /\bgo to the (hospital|ER|emergency)/i,
  /training\s+plan/i,
  /you\s+should\s+run/i,
  /\byou\s+must\b/i,
];

/** Logged but do not block — review candidates. */
const FLAG_PATTERNS: RegExp[] = [
  /\bguaranteed\b/i,
  /\bwill prevent\b/i,
  /\b100%/i,
  /\bdefinitely will\b/i,
  /\bcures?\b/i,
];

/** Additional patterns that are only blocked in roast output (not coach copy). */
const ROAST_BLOCK_PATTERNS: RegExp[] = [
  /\bpathetic\b/i,
  /\blazy\b/i,
  /\bweak\b/i,
  /\buseless\b/i,
  /\bembarrassing\b/i,
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\bquit\b/i,
  /\bgive up\b/i,
];

/**
 * Validates roast output — runs BOTH the standard blocklist AND the
 * roast-specific blocklist. Use for any text going into llm_weekly_analysis_roast.
 */
export function validateRoastOutput(text: string): {
  ok: boolean;
  reason?: string;
} {
  const base = validateLlmOutput(text);
  if (!base.ok) return base;

  const t = text.trim();
  for (const pattern of ROAST_BLOCK_PATTERNS) {
    if (pattern.test(t)) {
      return { ok: false, reason: `roast_blocked:${pattern.source}` };
    }
  }

  return { ok: true };
}

export function validateLlmOutput(text: string): {
  ok: boolean;
  reason?: string;
} {
  const t = text.trim();
  if (!t) return { ok: false, reason: "empty" };

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(t)) {
      return { ok: false, reason: `blocked:${pattern.source}` };
    }
  }

  for (const pattern of FLAG_PATTERNS) {
    if (pattern.test(t)) {
      console.warn(
        `[EnduranceIQ] LLM output flagged (allowed through): ${pattern.source}`,
      );
    }
  }

  return { ok: true };
}
