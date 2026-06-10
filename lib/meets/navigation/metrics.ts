import { getDistanceMiles } from "@/lib/gps/distance";
import { isPlausibleMotorcycleSpeedMph } from "@/lib/meets/navigation/speed";
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
  OffRouteSessionState,
} from "@/lib/meets/navigation/types";

function formatSpeedMph(speedMph: number | null | undefined): string {
  if (!isPlausibleMotorcycleSpeedMph(speedMph)) {
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

function isOffRouteGuidanceState(offRoute: OffRouteSessionState | undefined) {
  return (
    offRoute?.offRouteStatus === "off_route" ||
    offRoute?.offRouteStatus === "possibly_off_route" ||
    offRoute?.offRouteStatus === "returning"
  );
}

export function buildNavigationMetrics(
  route: NavigationRoute | null,
  progress: NavigationProgress | null,
  position: NavigationPosition | null,
  offRoute?: OffRouteSessionState,
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

  const rejoinPoint = offRoute?.nearestRejoinPoint;
  const showRejoinGuidance =
    isOffRouteGuidanceState(offRoute) && !!rejoinPoint && !!position;

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

  if (showRejoinGuidance && rejoinPoint && position) {
    const distanceToRejoinMeters = getDistanceMiles(position, rejoinPoint) * 1609.34;
    nextInstructionLabel = "Head to the nearest point on the route";
    distanceToManeuverLabel = formatManeuverDistance(distanceToRejoinMeters);
    nextTurnLabel = `Rejoin route in ${distanceToManeuverLabel}`;
  } else if (nextStep) {
    nextInstructionLabel = nextStep.instruction;
    distanceToManeuverLabel = formatManeuverDistance(distanceToManeuverMeters);
    nextTurnLabel = formatTurnInstruction(nextStep, distanceToManeuverMeters);
  }

  const timeRemainingLabel = estimateTimeRemainingLabel(
    progress.distanceRemainingMiles,
    position?.speedMph,
    remainingStepDurationSeconds,
  );

  return {
    etaLabel: timeRemainingLabel,
    distanceRemainingLabel: formatDistanceMiles(progress.distanceRemainingMiles),
    timeRemainingLabel,
    currentSpeedLabel: formatSpeedMph(position?.speedMph),
    nextInstructionLabel,
    distanceToManeuverLabel,
    nextTurnLabel,
    routeProgressLabel: formatPercentComplete(progress.percentComplete),
    hasManeuverData,
  };
}
