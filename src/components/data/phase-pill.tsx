/**
 * <PhasePill> — F15 periodisation phase indicator.
 *
 * Used in F14 countdown card, F14 arc tooltips, F10 strength rationale, and
 * the phase column in /learn. Colors come from the --phase-* CSS variables
 * (UI design §2.1).
 */

import type { PeriodizationPhase } from "@/lib/analytics/periodization";

const PHASE_LABELS_EN: Record<PeriodizationPhase, string> = {
  transition: "Transition",
  general_prep: "General prep",
  specific_prep: "Specific prep",
  pre_competition: "Pre-competition",
  taper: "Taper",
  race_week: "Race week",
  recovery: "Recovery",
};

const PHASE_LABELS_ID: Record<PeriodizationPhase, string> = {
  transition: "Transisi",
  general_prep: "Persiapan umum",
  specific_prep: "Persiapan spesifik",
  pre_competition: "Pra-kompetisi",
  taper: "Taper",
  race_week: "Minggu lomba",
  recovery: "Pemulihan",
};

const PHASE_TOKEN: Record<PeriodizationPhase, string> = {
  transition: "var(--phase-transition)",
  general_prep: "var(--phase-general-prep)",
  specific_prep: "var(--phase-specific-prep)",
  pre_competition: "var(--phase-pre-competition)",
  taper: "var(--phase-taper)",
  race_week: "var(--phase-race-week)",
  recovery: "var(--phase-recovery)",
};

export interface PhasePillProps {
  phase: PeriodizationPhase;
  locale?: "en" | "id";
  size?: "sm" | "md";
}

export function PhasePill({ phase, locale = "en", size = "md" }: PhasePillProps) {
  const labels = locale === "id" ? PHASE_LABELS_ID : PHASE_LABELS_EN;
  const color = PHASE_TOKEN[phase];
  const px = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";
  return (
    <span
      style={{ background: `${color}`, color: "var(--text-on-accent)" }}
      className={
        `inline-flex items-center rounded-sm ${px} ` +
        `font-sans ${text} font-medium uppercase tracking-wider`
      }
      aria-label={`Periodisation phase: ${labels[phase]}`}
    >
      {labels[phase]}
    </span>
  );
}

/**
 * Phase-specific copy table for "This week's focus" / countdown advisories
 * (PRD §5.7 F14.A). Exposed so the same copy renders on /dashboard countdown
 * card and on /race page detail panels.
 */
export const PHASE_FOCUS_COPY_EN: Record<PeriodizationPhase, string> = {
  transition: "Easy aerobic base, mobility, and recovery. No specific race target yet.",
  general_prep: "Build aerobic base; increase weekly volume gradually. Strength 2×/wk.",
  specific_prep: "Race-pace specificity begins. Add tempo and threshold work.",
  pre_competition: "Sharpen race-pace work; volume plateaus. Strength drops to 1–2×/wk.",
  taper: "Maintain intensity, reduce volume. Sleep + nutrition lead the rest of training.",
  race_week: "Race week — light shake-outs only. No strength from Wednesday onward.",
  recovery: "Active recovery. Walk, swim, easy spin. No structured running until week 2.",
};

export const PHASE_FOCUS_COPY_ID: Record<PeriodizationPhase, string> = {
  transition: "Aerobik ringan, mobilitas, dan pemulihan. Belum ada target lomba spesifik.",
  general_prep: "Bangun basis aerobik; tingkatkan volume mingguan bertahap. Strength 2×/mg.",
  specific_prep: "Spesifikitas race-pace dimulai. Tambah tempo dan threshold.",
  pre_competition: "Pertajam kerja race-pace; volume datar. Strength turun ke 1–2×/mg.",
  taper: "Jaga intensitas, kurangi volume. Tidur + nutrisi memimpin sisa latihan.",
  race_week: "Minggu lomba — hanya shake-out ringan. Tidak ada strength dari hari Rabu.",
  recovery: "Pemulihan aktif. Jalan, renang, sepeda ringan. Tidak lari terstruktur sebelum minggu 2.",
};
