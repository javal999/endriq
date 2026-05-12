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
