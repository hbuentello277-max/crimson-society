import { formatDistanceMiles, formatPercentComplete } from "@/lib/meets/navigation/route-builder";
import {
  formatManeuverDistance,
  formatTurnInstruction,
  resolveActiveStep,
} from "@/lib/meets/navigation/steps";
import type {
  NavigationMetrics,
  NavigationPosition,
  NavigationProgress,
  NavigationRoute,
} from "@/lib/meets/navigation/types";

function formatSpeedMph(speedMph: number | null | undefined): string {
  if (speedMph === null || speedMph === undefined || !Number.isFinite(speedMph) || speedMph < 0) {
    return "—";
  }
  return `${Math.round(speedMph)} mph`;
}

function estimateTimeRemainingLabel(
  distanceRemainingMiles: number,
  speedMph: number | null | undefined,
  remainingStepDurationSeconds: number | null,
): string {
  if (remainingStepDurationSeconds && remainingStepDurationSeconds > 0) {
    const totalMinutes = Math.round(remainingStepDurationSeconds / 60);
    if (totalMinutes < 1) return "<1 min";
    if (totalMinutes < 60) return `${totalMinutes} min`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (!speedMph || speedMph < 3 || distanceRemainingMiles <= 0) {
    return "—";
  }

  const hours = distanceRemainingMiles / speedMph;
  const totalMinutes = Math.round(hours * 60);

  if (totalMinutes < 1) return "<1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function sumRemainingStepDurationSeconds(
  route: NavigationRoute,
  nextStepIndex: number,
): number | null {
  if (!route.steps.length || nextStepIndex < 0) return null;

  const total = route.steps
    .slice(nextStepIndex)
    .reduce((sum, step) => sum + Math.max(0, step.durationSeconds), 0);

  return total > 0 ? total : null;
}

function buildFallbackTurnLabel(hasManeuverData: boolean): string {
  return hasManeuverData ? "Follow route" : "Route guidance unavailable";
}

export function buildNavigationMetrics(
  route: NavigationRoute | null,
  progress: NavigationProgress | null,
  position: NavigationPosition | null,
): NavigationMetrics {
  const hasManeuverData = !!route?.steps.length;

  if (!route || !progress) {
    const fallback = buildFallbackTurnLabel(hasManeuverData);
    return {
      etaLabel: "—",
      distanceRemainingLabel: route
        ? formatDistanceMiles(route.totalDistanceMiles)
        : "—",
      timeRemainingLabel: "—",
      currentSpeedLabel: formatSpeedMph(position?.speedMph),
      nextInstructionLabel: fallback,
      distanceToManeuverLabel: "—",
      nextTurnLabel: fallback,
      routeProgressLabel: "0%",
      hasManeuverData,
    };
  }

  const { nextStep, distanceToManeuverMeters } = resolveActiveStep(
    route.steps,
    route.points,
    progress,
    position,
  );

  const nextStepIndex = nextStep
    ? route.steps.findIndex((step) => step.id === nextStep.id)
    : -1;
  const remainingStepDurationSeconds = sumRemainingStepDurationSeconds(route, nextStepIndex);

  let nextInstructionLabel = buildFallbackTurnLabel(hasManeuverData);
  let distanceToManeuverLabel = "—";
  let nextTurnLabel = nextInstructionLabel;

  if (nextStep) {
    nextInstructionLabel = nextStep.instruction;
    distanceToManeuverLabel = formatManeuverDistance(distanceToManeuverMeters);
    nextTurnLabel = formatTurnInstruction(nextStep, distanceToManeuverMeters);
  }

  return {
    etaLabel: "—",
    distanceRemainingLabel: formatDistanceMiles(progress.distanceRemainingMiles),
    timeRemainingLabel: estimateTimeRemainingLabel(
      progress.distanceRemainingMiles,
      position?.speedMph,
      remainingStepDurationSeconds,
    ),
    currentSpeedLabel: formatSpeedMph(position?.speedMph),
    nextInstructionLabel,
    distanceToManeuverLabel,
    nextTurnLabel,
    routeProgressLabel: formatPercentComplete(progress.percentComplete),
    hasManeuverData,
  };
}
