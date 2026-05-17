/**
 * <PredictedFinishCard> — F14.B surface (gated).
 *
 * Renders ONLY when:
 *   - The flag FF_PREDICTED_FINISH is on (parent decides)
 *   - The prediction is eligible (callers pass an eligible result)
 *
 * For ineligible predictions the card returns null — PRD §5.7 F14.B
 * mandates silence rather than a greyed placeholder.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.7 F14.B; PHASE-2.0-UI-DESIGN.md §4.3.
 */

import { HairlineCard } from "@/components/ui/hairline-card";
import { EvidenceCitation } from "@/components/data/evidence-citation";
import {
  formatFinishTime,
  type PredictedFinishResult,
} from "@/lib/analytics/predictedFinish";

export interface PredictedFinishCardProps {
  prediction: PredictedFinishResult;
  /** Locale for the confidence label. */
  locale?: "en" | "id";
}

const CONFIDENCE_LABEL_EN: Record<"high" | "moderate", string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
};
const CONFIDENCE_LABEL_ID: Record<"high" | "moderate", string> = {
  high: "Keyakinan tinggi",
  moderate: "Keyakinan sedang",
};

const RACE_TYPE_LABELS: Record<string, string> = {
  marathon: "Marathon",
  half_marathon: "Half marathon",
  "10k": "10K",
  "5k": "5K",
};

export function PredictedFinishCard({ prediction, locale = "en" }: PredictedFinishCardProps) {
  if (!prediction.eligible) return null;

  const labels = locale === "id" ? CONFIDENCE_LABEL_ID : CONFIDENCE_LABEL_EN;

  return (
    <HairlineCard emphasised className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Predicted finish
        </p>
        {prediction.frozen && (
          <span className="rounded-sm bg-[var(--surface-raised)] px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Frozen · race week
          </span>
        )}
      </div>

      <p className="font-mono text-[28px] leading-[32px] font-medium text-[var(--text-primary)]">
        {formatFinishTime(prediction.lowSec)} – {formatFinishTime(prediction.highSec)}
      </p>

      <div className="flex flex-wrap items-center gap-2 font-sans text-[12px] text-[var(--text-secondary)]">
        <span className="rounded-sm bg-[var(--accent-soft)] px-2 py-0.5 font-medium uppercase tracking-wider text-[var(--accent-dark)]">
          {labels[prediction.confidence]}
        </span>
        <span>
          For your {RACE_TYPE_LABELS[prediction.inputs.targetDistance] ?? "race"}
        </span>
      </div>

      {/* Input chips per UI design §1: PR + history confidence inputs */}
      <ul className="flex flex-wrap gap-2 pt-1">
        <Chip>
          PR: {RACE_TYPE_LABELS[prediction.inputs.pr.distanceKm === 5 ? "5k" : prediction.inputs.pr.distanceKm === 10 ? "10k" : prediction.inputs.pr.distanceKm === 21.0975 ? "half_marathon" : "marathon"] ?? `${prediction.inputs.pr.distanceKm}km`}{" "}
          {formatFinishTime(prediction.inputs.pr.timeSec)} ({prediction.inputs.pr.raceDate})
        </Chip>
        <Chip>VDOT {prediction.inputs.vdot}</Chip>
        <Chip>{prediction.inputs.weeksOfConsistentTraining} consistent weeks</Chip>
      </ul>

      <p className="pt-1 font-sans text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
        Methodology:{" "}
        <EvidenceCitation id="riegel_1981" />
        ;{" "}
        <EvidenceCitation id="vickers_vertosick_2016" />
        ;{" "}
        <EvidenceCitation id="daniels_2014_vdot" />
      </p>
    </HairlineCard>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-sm border border-[var(--border-hairline)] bg-[var(--surface)] px-2 py-0.5 font-sans text-[11px] text-[var(--text-secondary)]">
      {children}
    </li>
  );
}
