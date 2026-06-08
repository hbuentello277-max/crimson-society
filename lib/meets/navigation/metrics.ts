import { formatDistanceMiles, formatPercentComplete } from "@/lib/meets/navigation/route-builder";
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
): string {
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

/**
 * Builds HUD metrics. ETA / turn-by-turn use placeholders until Phase 4+.
 */
export function buildNavigationMetrics(
  route: NavigationRoute | null,
  progress: NavigationProgress | null,
  position: NavigationPosition | null,
): NavigationMetrics {
  if (!route || !progress) {
    return {
      etaLabel: "—",
      distanceRemainingLabel: route
        ? formatDistanceMiles(route.totalDistanceMiles)
        : "—",
      timeRemainingLabel: "—",
      currentSpeedLabel: formatSpeedMph(position?.speedMph),
      nextTurnLabel: "Follow route",
      routeProgressLabel: "0%",
    };
  }

  return {
    etaLabel: "—",
    distanceRemainingLabel: formatDistanceMiles(progress.distanceRemainingMiles),
    timeRemainingLabel: estimateTimeRemainingLabel(
      progress.distanceRemainingMiles,
      position?.speedMph,
    ),
    currentSpeedLabel: formatSpeedMph(position?.speedMph),
    nextTurnLabel: "Follow route",
    routeProgressLabel: formatPercentComplete(progress.percentComplete),
  };
}
