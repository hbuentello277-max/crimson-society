import type { ConfidenceInputs } from "@/lib/observations/types";

const BASE_BY_CLASS: Record<ConfidenceInputs["rule_class"], number> = {
  metric_trend: 0.86,
  multi_workflow_diagnosis: 0.88,
  integration_probe: 0.91,
  absence_summary: 0.95,
  revenue_summary: 0.84,
};

export function computeObservationConfidence(inputs: ConfidenceInputs): number {
  let confidence = inputs.base_confidence ?? BASE_BY_CLASS[inputs.rule_class];

  if (inputs.complete_evidence) {
    confidence += 0.03;
  }

  if (inputs.partial_evidence) {
    confidence -= 0.1;
  }

  if (inputs.agreeing_signals >= 3) {
    confidence += 0.05;
  }

  if (inputs.conflicting_signals) {
    confidence -= 0.15;
  }

  if (inputs.stale_data) {
    confidence -= 0.08;
  }

  if (inputs.low_sample_size) {
    confidence -= 0.12;
  }

  return Math.max(0.5, Math.min(0.99, Math.round(confidence * 1000) / 1000));
}
