import type { LlmSessionStatusRow, LlmWeeklySections } from "@/lib/llm/types";

export function stripCodeFence(raw: string): string {
  let t = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fenced) t = fenced[1].trim();
  return t;
}

export function parseWeeklySectionsJson(
  raw: string,
): LlmWeeklySections | null {
  try {
    const text = stripCodeFence(raw);
    const obj = JSON.parse(text) as Record<string, unknown>;
    const wentWell = pickStr(obj, ["went_well", "wentWell"]);
    const needsWork = pickStr(obj, ["needs_work", "needsWork"]);
    const nextWeek = pickStr(obj, ["next_week", "nextWeek"]);
    if (!wentWell || !needsWork || !nextWeek) return null;
    const minLen = 12;
    if (
      wentWell.length < minLen ||
      needsWork.length < minLen ||
      nextWeek.length < minLen
    )
      return null;
    return { wentWell, needsWork, nextWeek };
  } catch {
    return null;
  }
}

export function parseSessionStatusesJson(
  raw: string,
  allowedIds: Set<string>,
): LlmSessionStatusRow[] | null {
  try {
    const text = stripCodeFence(raw);
    const parsed = JSON.parse(text) as unknown;
    // Accept bare array (old format) or { sessions: [...] } (structured output format)
    let arr: unknown[] | null = null;
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed && typeof parsed === "object" && "sessions" in parsed) {
      const s = (parsed as Record<string, unknown>).sessions;
      if (Array.isArray(s)) arr = s;
    }
    if (!arr) return null;
    const out: LlmSessionStatusRow[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const id =
        pickStr(row, ["workout_id", "workoutId"]) ??
        (typeof row.id === "string" ? row.id : null);
      const explanation =
        pickStr(row, ["explanation", "text"]) ?? null;
      if (!id || !explanation || explanation.length < 8) continue;
      if (!allowedIds.has(id)) continue;
      const v = validateExplanationCopy(explanation);
      if (!v.ok) continue;
      out.push({ workout_id: id, explanation: explanation.trim() });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function pickStr(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Lightweight post-parse guard (duplicate of validator for JSON leaf strings). */
function validateExplanationCopy(text: string): { ok: boolean } {
  const t = text.trim();
  if (!t) return { ok: false };
  if (
    /training\s+plan|you\s+should\s+run|you\s+must\b|\bprescribed\b|\bprescri/i.test(
      t,
    )
  )
    return { ok: false };
  return { ok: true };
}
