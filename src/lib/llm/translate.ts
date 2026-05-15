import { completeAnthropic } from "@/lib/llm/client";

const TRANSLATE_SYSTEM = `You are a translator. Translate English text to casual Indonesian (Bahasa gaul, "lo-gue" register).
Keep these technical terms in English: HR, Zone 1-2, Zone 3, easy run, intervals, tempo, long run, recovery, ACWR, load ratio, interference, RPE, taper, Strava, BPM, kcal.
Preserve meaning and structure exactly. No additions, no editorializing. Return only the translated text.`;

/**
 * Translates English training-analysis text to casual Bahasa Indonesia.
 * Used only when athlete.preferred_locale === "id".
 * The English source is the canonical safety surface — the English blocklist runs on source, not output.
 */
export async function translateToBahasaCasual(englishText: string): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const result = await completeAnthropic({
    user: englishText,
    maxTokens: Math.min(2000, Math.ceil(englishText.length * 1.5)),
    systemOverride: TRANSLATE_SYSTEM,
  });
  return {
    text: result.text.trim(),
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
