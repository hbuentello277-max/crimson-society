import { getDistanceMiles } from "@/lib/gps/distance";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import type { SnappedRouteStep } from "@/lib/routing";
import type { NavigationPosition, NavigationProgress, NavigationStep } from "@/lib/meets/navigation/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    isRecord(value) &&
    typeof value.lat === "number" &&
    Number.isFinite(value.lat) &&
    typeof value.lng === "number" &&
    Number.isFinite(value.lng)
  );
}

function nearestRouteIndex(route: RoutePoint[], point: RoutePoint, minIndex = 0): number {
  let bestIndex = minIndex;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = minIndex; index < route.length; index += 1) {
    const distance = getDistanceMiles(route[index], point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function buildNavigationStepsFromSnapped(
  snappedSteps: SnappedRouteStep[],
  route: RoutePoint[],
): NavigationStep[] {
  if (!snappedSteps.length || route.length < 2) return [];

  const steps: NavigationStep[] = [];
  let minIndex = 0;

  for (let index = 0; index < snappedSteps.length; index += 1) {
    const step = snappedSteps[index];
    const anchor =
      step.maneuverLocation ??
      step.stepGeometry[0] ??
      route[minIndex] ??
      route[route.length - 1];

    const routePointIndexStart = nearestRouteIndex(route, anchor, minIndex);
    const nextAnchor =
      snappedSteps[index + 1]?.maneuverLocation ??
      snappedSteps[index + 1]?.stepGeometry[0] ??
      route[route.length - 1];
    const nextStart =
      index < snappedSteps.length - 1
        ? nearestRouteIndex(route, nextAnchor, routePointIndexStart + 1)
        : route.length - 1;
    const routePointIndexEnd = Math.max(routePointIndexStart, nextStart - 1);

    steps.push({
      id: `step-${index}`,
      instruction: step.instruction,
      distanceMeters: step.distanceMeters,
      durationSeconds: step.durationSeconds,
      maneuverType: step.maneuverType,
      maneuverModifier: step.maneuverModifier,
      maneuverLocation: step.maneuverLocation,
      stepGeometry: step.stepGeometry,
      routePointIndexStart,
      routePointIndexEnd,
    });

    minIndex = Math.max(minIndex, routePointIndexStart + 1);
  }

  return steps;
}

export function parseRouteSteps(value: unknown, route: RoutePoint[]): NavigationStep[] {
  if (!Array.isArray(value) || route.length < 2) return [];

  const parsed: NavigationStep[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!isRecord(item)) continue;

    const stepGeometry = Array.isArray(item.stepGeometry)
      ? item.stepGeometry.filter(isRoutePoint)
      : [];
    const maneuverLocation = isRoutePoint(item.maneuverLocation) ? item.maneuverLocation : null;

    const routePointIndexStart =
      typeof item.routePointIndexStart === "number" && Number.isFinite(item.routePointIndexStart)
        ? Math.max(0, Math.min(route.length - 1, Math.round(item.routePointIndexStart)))
        : 0;
    const routePointIndexEnd =
      typeof item.routePointIndexEnd === "number" && Number.isFinite(item.routePointIndexEnd)
        ? Math.max(routePointIndexStart, Math.min(route.length - 1, Math.round(item.routePointIndexEnd)))
        : routePointIndexStart;

    parsed.push({
      id: typeof item.id === "string" ? item.id : `step-${index}`,
      instruction: typeof item.instruction === "string" ? item.instruction : "Continue",
      distanceMeters:
        typeof item.distanceMeters === "number" && Number.isFinite(item.distanceMeters)
          ? item.distanceMeters
          : 0,
      durationSeconds:
        typeof item.durationSeconds === "number" && Number.isFinite(item.durationSeconds)
          ? item.durationSeconds
          : 0,
      maneuverType: typeof item.maneuverType === "string" ? item.maneuverType : null,
      maneuverModifier: typeof item.maneuverModifier === "string" ? item.maneuverModifier : null,
      maneuverLocation,
      stepGeometry,
      routePointIndexStart,
      routePointIndexEnd,
    });
  }

  return parsed;
}

export function serializeRouteSteps(steps: NavigationStep[]): NavigationStep[] {
  return steps.map((step) => ({
    id: step.id,
    instruction: step.instruction,
    distanceMeters: step.distanceMeters,
    durationSeconds: step.durationSeconds,
    maneuverType: step.maneuverType,
    maneuverModifier: step.maneuverModifier,
    maneuverLocation: step.maneuverLocation,
    stepGeometry: step.stepGeometry,
    routePointIndexStart: step.routePointIndexStart,
    routePointIndexEnd: step.routePointIndexEnd,
  }));
}

export type ActiveStepMatch = {
  nextStep: NavigationStep | null;
  distanceToManeuverMeters: number | null;
};

function distanceAlongRouteMeters(route: RoutePoint[], fromIndex: number, toIndex: number): number {
  if (fromIndex >= toIndex) return 0;

  let totalMiles = 0;
  for (let index = fromIndex; index < toIndex; index += 1) {
    totalMiles += getDistanceMiles(route[index], route[index + 1]);
  }

  return totalMiles * 1609.34;
}

export function resolveActiveStep(
  steps: NavigationStep[],
  route: RoutePoint[],
  progress: NavigationProgress | null,
  position: NavigationPosition | null,
): ActiveStepMatch {
  if (!steps.length || !progress) {
    return { nextStep: null, distanceToManeuverMeters: null };
  }

  const currentIndex = progress.currentRouteIndex;
  const nextStep =
    steps.find((step) => step.routePointIndexStart >= currentIndex) ??
    steps[steps.length - 1] ??
    null;

  if (!nextStep) {
    return { nextStep: null, distanceToManeuverMeters: null };
  }

  let distanceToManeuverMeters: number | null = null;

  if (position && nextStep.maneuverLocation) {
    distanceToManeuverMeters = getDistanceMiles(position, nextStep.maneuverLocation) * 1609.34;
  } else if (progress) {
    distanceToManeuverMeters = distanceAlongRouteMeters(
      route,
      currentIndex,
      nextStep.routePointIndexStart,
    );
  }

  if (
    distanceToManeuverMeters !== null &&
    (!Number.isFinite(distanceToManeuverMeters) || distanceToManeuverMeters < 0)
  ) {
    distanceToManeuverMeters = nextStep.distanceMeters;
  }

  return { nextStep, distanceToManeuverMeters };
}

export function formatManeuverDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return "—";
  }

  const miles = meters * 0.000621371;
  if (miles < 0.1) {
    return `${Math.round(meters * 3.28084)} ft`;
  }

  return `${miles.toFixed(1)} mi`;
}

export function formatTurnInstruction(
  step: NavigationStep,
  distanceToManeuverMeters: number | null,
): string {
  const instruction = step.instruction.trim() || "Continue";
  const distanceLabel = formatManeuverDistance(
    distanceToManeuverMeters ?? step.distanceMeters,
  );

  if (distanceLabel === "—") {
    return `${instruction} for ${formatManeuverDistance(step.distanceMeters)}`;
  }

  const useForPattern =
    distanceToManeuverMeters !== null &&
    distanceToManeuverMeters > step.distanceMeters * 0.85 &&
    step.maneuverType === "continue";

  if (useForPattern) {
    return `${instruction} for ${formatManeuverDistance(step.distanceMeters)}`;
  }

  return `${instruction} in ${distanceLabel}`;
}
