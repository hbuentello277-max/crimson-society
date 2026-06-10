"use client";

import { memo } from "react";
import { openMapsNavigation } from "@/lib/meets/maps-links";
import { resolveManeuverArrow } from "@/lib/meets/navigation/maneuver-arrow";
import {
  BACK_ON_ROUTE_BANNER_MESSAGE,
  OFF_ROUTE_BANNER_MESSAGE,
} from "@/lib/meets/navigation/off-route";
import { formatManeuverDistance } from "@/lib/meets/navigation/steps";
import { resolveActiveStep } from "@/lib/meets/navigation/steps";
import type { NavigationSession } from "@/lib/meets/navigation/types";

type NavigationDirectionBannerProps = {
  session: NavigationSession;
};

function TripStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[8px] uppercase tracking-[0.14em] text-emerald-200/70">{label}</p>
      <p className="mt-0.5 text-sm font-semibold leading-none text-white">{value}</p>
    </div>
  );
}

function NavigationDirectionBannerComponent({ session }: NavigationDirectionBannerProps) {
  const { metrics, route, progress, navigationState, offRoute, arrival, latestPosition } = session;

  const showArrival =
    (navigationState === "navigating" || navigationState === "paused") && !!arrival.bannerMessage;
  const showOffRoute =
    (navigationState === "navigating" || navigationState === "paused") &&
    offRoute.bannerMessage === OFF_ROUTE_BANNER_MESSAGE;
  const showBackOnRoute =
    navigationState === "navigating" && offRoute.bannerMessage === BACK_ON_ROUTE_BANNER_MESSAGE;

  const activeStep =
    route && progress
      ? resolveActiveStep(route.steps, route.points, progress, latestPosition).nextStep
      : null;
  const maneuverArrow = resolveManeuverArrow(activeStep);

  if (showArrival) {
    return (
      <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-2xl text-emerald-300">
            ✓
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/90">Arrival</p>
            <p className="mt-1 text-lg font-semibold leading-tight text-emerald-50">
              {arrival.bannerMessage}
            </p>
          </div>
          <div className="hidden shrink-0 gap-4 sm:flex">
            <TripStat label="ETA" value={metrics.etaLabel} />
            <TripStat label="Remaining" value={metrics.distanceRemainingLabel} />
            <TripStat label="Progress" value={metrics.routeProgressLabel} />
          </div>
        </div>
      </div>
    );
  }

  if (showOffRoute) {
    const rejoinDistanceLabel =
      metrics.distanceToManeuverLabel !== "—" ? metrics.distanceToManeuverLabel : null;

    return (
      <div className="shrink-0 border-b border-[#f0b429]/40 bg-[#2a1d05] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#f0b429]/50 bg-[#3a2a08]/80 text-xl text-[#fff4d6]">
            !
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#f6d58b]">Route Alert</p>
            <p className="mt-1 text-base font-semibold leading-tight text-[#fff4d6]">
              {OFF_ROUTE_BANNER_MESSAGE}
            </p>
            {offRoute.distanceFromRouteMeters !== null ? (
              <p className="mt-1 text-xs text-[#f6d58b]/90">
                About {formatManeuverDistance(offRoute.distanceFromRouteMeters)} off route
              </p>
            ) : null}
            {rejoinDistanceLabel ? (
              <p className="mt-0.5 text-xs text-[#fff4d6]/90">
                Rejoin route in {rejoinDistanceLabel}
              </p>
            ) : null}
            {offRoute.nearestRejoinPoint ? (
              <button
                type="button"
                onClick={() =>
                  openMapsNavigation({
                    lat: offRoute.nearestRejoinPoint!.lat,
                    lng: offRoute.nearestRejoinPoint!.lng,
                    label: "Rejoin route",
                  })
                }
                className="mt-2 rounded-lg border border-[#f0b429]/60 bg-[#3a2a08]/80 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-[#fff4d6] transition hover:border-[#f0b429]"
              >
                Open Maps to Rejoin
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (showBackOnRoute) {
    return (
      <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-2.5 text-center">
        <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-300/90">Route Update</p>
        <p className="mt-1 text-sm font-semibold text-emerald-100">{BACK_ON_ROUTE_BANNER_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/35 bg-emerald-500/10 text-3xl font-semibold leading-none text-emerald-300">
          {maneuverArrow}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/90">Next Turn</p>
          <p className="mt-1 text-base font-semibold leading-snug text-white sm:text-lg">
            {metrics.nextTurnLabel}
          </p>
          {metrics.distanceToManeuverLabel !== "—" ? (
            <p className="mt-1 text-sm font-medium text-emerald-300">
              {metrics.distanceToManeuverLabel}
            </p>
          ) : null}
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-3 sm:gap-4">
          <TripStat label="ETA" value={metrics.etaLabel} />
          <TripStat label="Remaining" value={metrics.distanceRemainingLabel} />
          <TripStat label="Progress" value={metrics.routeProgressLabel} />
        </div>
      </div>
    </div>
  );
}

export const NavigationDirectionBanner = memo(NavigationDirectionBannerComponent);
