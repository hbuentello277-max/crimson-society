import { memo } from "react";
import { openMapsNavigation } from "@/lib/meets/maps-links";
import {
  BACK_ON_ROUTE_BANNER_MESSAGE,
  OFF_ROUTE_BANNER_MESSAGE,
} from "@/lib/meets/navigation/off-route";
import { formatManeuverDistance } from "@/lib/meets/navigation/steps";
import type { NavigationMetrics, NavigationSession } from "@/lib/meets/navigation/types";

type NavigationHudProps = {
  session: NavigationSession;
  onRecenter: () => void;
  onRetryGps: () => void;
  onTogglePause: () => void;
  canRecenter: boolean;
};

function CompactMetric({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <p className="text-[8px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

function NavigationHudComponent({
  session,
  onRecenter,
  onRetryGps,
  onTogglePause,
  canRecenter,
}: NavigationHudProps) {
  const { metrics, meet, route, navigationState, error, shareError, isPaused, offRoute, arrival } =
    session;

  const showGpsAlert =
    navigationState === "gps_permission_required" ||
    navigationState === "error" ||
    !!error;
  const showOffRouteBanner =
    (navigationState === "navigating" || navigationState === "paused") &&
    offRoute.bannerMessage === OFF_ROUTE_BANNER_MESSAGE;
  const showBackOnRouteBanner =
    navigationState === "navigating" && offRoute.bannerMessage === BACK_ON_ROUTE_BANNER_MESSAGE;
  const showArrivalBanner =
    (navigationState === "navigating" || navigationState === "paused") && !!arrival.bannerMessage;
  const showOffRouteDistance =
    showOffRouteBanner &&
    offRoute.distanceFromRouteMeters !== null &&
    Number.isFinite(offRoute.distanceFromRouteMeters);
  const canOpenRejoinMaps = !!offRoute.nearestRejoinPoint;
  const rejoinDistanceLabel =
    showOffRouteBanner && metrics.distanceToManeuverLabel !== "—"
      ? metrics.distanceToManeuverLabel
      : null;

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-[600] sm:inset-x-4">
      {showArrivalBanner ? (
        <div className="pointer-events-none mb-2 rounded-xl border border-emerald-400/50 bg-[#07150f]/95 px-3 py-2.5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-300/90">Arrival</p>
          <p className="mt-1 text-base font-semibold leading-tight text-emerald-100">
            {arrival.bannerMessage}
          </p>
        </div>
      ) : null}

      {showOffRouteBanner ? (
        <div className="pointer-events-auto mb-2 rounded-xl border border-[#f0b429]/70 bg-[#2a1d05]/95 px-3 py-2.5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#f6d58b]">Route Alert</p>
          <p className="mt-1 text-base font-semibold leading-tight text-[#fff4d6]">
            {OFF_ROUTE_BANNER_MESSAGE}
          </p>
          {showOffRouteDistance ? (
            <p className="mt-1 text-xs text-[#f6d58b]/90">
              About {formatManeuverDistance(offRoute.distanceFromRouteMeters)} off route
            </p>
          ) : null}
          {rejoinDistanceLabel ? (
            <p className="mt-1 text-xs text-[#fff4d6]/90">
              Rejoin route in {rejoinDistanceLabel}
            </p>
          ) : null}
          {canOpenRejoinMaps ? (
            <button
              type="button"
              onClick={() =>
                openMapsNavigation({
                  lat: offRoute.nearestRejoinPoint!.lat,
                  lng: offRoute.nearestRejoinPoint!.lng,
                  label: "Rejoin route",
                })
              }
              className="mt-2 rounded-lg border border-[#f0b429]/60 bg-[#3a2a08]/80 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[#fff4d6] transition hover:border-[#f0b429]"
            >
              Open Maps to Rejoin
            </button>
          ) : null}
        </div>
      ) : null}

      {showBackOnRouteBanner ? (
        <div className="pointer-events-none mb-2 rounded-xl border border-emerald-400/50 bg-[#07150f]/95 px-3 py-2.5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-300/90">Route Update</p>
          <p className="mt-1 text-base font-semibold leading-tight text-emerald-100">
            {BACK_ON_ROUTE_BANNER_MESSAGE}
          </p>
        </div>
      ) : null}

      <div className="pointer-events-auto mx-auto max-w-md rounded-xl border border-white/10 bg-black/82 p-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {route && meet ? (
          <p className="mb-2 truncate text-[10px] text-zinc-400">
            <span className="text-zinc-300">●</span> {route.meetPoint}
            <span className="mx-1.5 text-zinc-600">→</span>
            <span className="text-[#f6d58b]">★</span> {route.destination}
          </p>
        ) : null}

        <HudMetricsGrid metrics={metrics} />

        {showGpsAlert ? (
          <div className="mt-2 rounded-lg border border-[#b4141e]/50 bg-[#10080a]/90 px-3 py-2 text-xs leading-5 text-[#f0c9ce]">
            {error ?? "GPS permission is required for navigation."}
          </div>
        ) : null}

        {shareError ? (
          <div className="mt-2 rounded-lg border border-[#b4141e]/40 bg-[#10080a]/70 px-3 py-2 text-[10px] leading-5 text-[#f0c9ce]">
            {shareError}
          </div>
        ) : null}

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onRecenter}
            disabled={!canRecenter}
            className="rounded-lg border border-white/10 px-2 py-2 text-[9px] uppercase tracking-[0.12em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7] disabled:cursor-not-allowed disabled:text-zinc-600"
          >
            Recenter
          </button>
          <button
            type="button"
            onClick={onRetryGps}
            className="rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 px-2 py-2 text-[9px] uppercase tracking-[0.12em] text-[#f4dadd] transition hover:bg-[#b4141e]/40"
          >
            {navigationState === "gps_permission_required" || navigationState === "error"
              ? "Retry GPS"
              : "Refresh GPS"}
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="rounded-lg border border-white/10 px-2 py-2 text-[9px] uppercase tracking-[0.12em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HudMetricsGrid({ metrics }: { metrics: NavigationMetrics }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-2">
      <CompactMetric label="Next turn" value={metrics.nextTurnLabel} wide />
      <CompactMetric label="Remaining" value={metrics.distanceRemainingLabel} />
      <CompactMetric label="ETA" value={metrics.etaLabel} />
      <CompactMetric label="Time left" value={metrics.timeRemainingLabel} />
      <CompactMetric label="Speed" value={metrics.currentSpeedLabel} />
      <CompactMetric label="Progress" value={metrics.routeProgressLabel} />
    </div>
  );
}

export const NavigationHud = memo(NavigationHudComponent);
