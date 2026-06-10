"use client";

import Link from "next/link";
import { memo } from "react";
import { openMapsNavigation } from "@/lib/meets/maps-links";
import {
  formatRiderDistanceLine,
  meetArrivalBannerMessage,
} from "@/lib/meets/navigation/arrival-flow";
import { resolveManeuverArrow } from "@/lib/meets/navigation/maneuver-arrow";
import {
  BACK_ON_ROUTE_BANNER_MESSAGE,
  OFF_ROUTE_BANNER_MESSAGE,
} from "@/lib/meets/navigation/off-route";
import { formatManeuverDistance } from "@/lib/meets/navigation/steps";
import { resolveActiveStep } from "@/lib/meets/navigation/steps";
import { formatSpeedHudLabel } from "@/lib/meets/navigation/speed";
import type { NavigationSpeedHud } from "@/lib/meets/navigation/speed";
import type { NavigationSession } from "@/lib/meets/navigation/types";

type NavigationDirectionBannerProps = {
  session: NavigationSession;
  speedHud: NavigationSpeedHud;
  onShowRiders?: () => void;
};

function TripStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden text-right sm:block">
      <p className="text-[8px] uppercase tracking-[0.14em] text-emerald-200/70">{label}</p>
      <p className="mt-0.5 text-sm font-semibold leading-none text-white">{value}</p>
    </div>
  );
}

function NavigationDirectionBannerComponent({
  session,
  speedHud,
  onShowRiders,
}: NavigationDirectionBannerProps) {
  const { metrics, route, progress, navigationState, offRoute, arrival, arrivalUi, latestPosition } =
    session;
  const arrivalPhase = arrivalUi.phase;

  const showDestinationArrival =
    arrivalPhase === "destination_notice" || arrivalPhase === "ride_summary";
  const showMeetArrival =
    arrivalPhase === "meet_start_notice" || arrivalPhase === "find_group";
  const showClassicArrival =
    !showMeetArrival &&
    !showDestinationArrival &&
    (navigationState === "navigating" || navigationState === "paused") &&
    !!arrival.bannerMessage;

  const showOffRoute =
    !showMeetArrival &&
    !showDestinationArrival &&
    (navigationState === "navigating" || navigationState === "paused") &&
    offRoute.bannerMessage === OFF_ROUTE_BANNER_MESSAGE;
  const showBackOnRoute =
    navigationState === "navigating" && offRoute.bannerMessage === BACK_ON_ROUTE_BANNER_MESSAGE;

  const activeStep =
    route && progress
      ? resolveActiveStep(route.steps, route.points, progress, latestPosition).nextStep
      : null;
  const maneuverArrow = resolveManeuverArrow(activeStep);

  if (showDestinationArrival) {
    const bannerMessage =
      meetArrivalBannerMessage("destination_notice") ?? arrival.bannerMessage ?? "";

    if (arrivalPhase === "ride_summary") {
      return (
        <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-2xl text-emerald-300">
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/90">Ride Summary</p>
              <p className="mt-1 text-lg font-semibold leading-tight text-emerald-50">
                {bannerMessage}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-emerald-100/90 sm:grid-cols-3">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-emerald-200/70">Duration</p>
                  <p className="mt-0.5 font-medium">{route?.plannedDurationLabel ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-emerald-200/70">Distance</p>
                  <p className="mt-0.5 font-medium">{route?.plannedDistanceLabel ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-emerald-200/70">Progress</p>
                  <p className="mt-0.5 font-medium">{metrics.routeProgressLabel}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-emerald-200/70">Avg Speed</p>
                  <p className="mt-0.5 font-medium">{metrics.currentSpeedLabel}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-emerald-200/70">Max Rider Speed</p>
                  <p className="mt-0.5 font-medium">{formatSpeedHudLabel(speedHud.maxMph)}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-emerald-200/70">Credits Earned</p>
                  <p className="mt-0.5 font-medium">Pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-2xl text-emerald-300">
            ✓
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/90">Arrival</p>
            <p className="mt-1 text-xl font-semibold leading-tight text-emerald-50 sm:text-2xl">
              {bannerMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showMeetArrival) {
    const bannerMessage =
      meetArrivalBannerMessage(
        arrivalPhase === "find_group" ? "meet_start_notice" : "meet_start_notice",
      ) ?? "You've arrived at the meet start.";

    if (arrivalPhase === "find_group") {
      const nearbyRiders = arrivalUi.nearbyRiders;
      const hasRiderLocations = nearbyRiders.length > 0;

      return (
        <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-lg text-emerald-300">
              ◉
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/90">Find The Group</p>
              {arrivalUi.hostName ? (
                <p className="mt-1 text-sm text-zinc-300">
                  Host: <span className="font-medium text-white">{arrivalUi.hostName}</span>
                </p>
              ) : null}
              {arrivalUi.liveRiderCount > 0 ? (
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-200/80">
                  {arrivalUi.liveRiderCount} rider{arrivalUi.liveRiderCount === 1 ? "" : "s"} sharing location
                </p>
              ) : null}
              {hasRiderLocations ? (
                <div className="mt-2 space-y-1">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Riders Nearby</p>
                  {nearbyRiders.map((rider) => (
                    <p key={`${rider.role}-${rider.name}`} className="text-sm font-medium text-emerald-100">
                      {formatRiderDistanceLine(rider)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-emerald-100/90">
                  Waiting for riders to begin sharing location.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {arrivalUi.meetChatHref ? (
                  <Link
                    href={arrivalUi.meetChatHref}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-300"
                  >
                    Open Meet Chat
                  </Link>
                ) : null}
                {onShowRiders ? (
                  <button
                    type="button"
                    onClick={onShowRiders}
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-zinc-100 transition hover:border-emerald-300/50"
                  >
                    Show Riders
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-xl text-emerald-300">
            ✓
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/90">Arrival</p>
            <p className="mt-1 text-base font-semibold leading-snug text-emerald-50 sm:text-lg">
              {bannerMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showClassicArrival) {
    return (
      <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-2xl text-emerald-300">
            ✓
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/90">Arrival</p>
            <p className="mt-1 text-xl font-semibold leading-tight text-emerald-50 sm:text-2xl">
              {arrival.bannerMessage}
            </p>
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
            <p className="mt-1 text-base font-semibold leading-tight text-[#fff4d6] sm:text-lg">
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
    <div className="shrink-0 border-b border-emerald-500/30 bg-[#071a12] px-4 py-3.5">
      <div className="mx-auto flex max-w-4xl items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/35 bg-emerald-500/10 text-3xl font-semibold leading-none text-emerald-300 sm:h-14 sm:w-14 sm:text-4xl">
          {maneuverArrow}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/90">Next Turn</p>
          <p className="mt-1 text-lg font-semibold leading-snug text-white sm:text-2xl">
            {metrics.nextTurnLabel}
          </p>
          {metrics.distanceToManeuverLabel !== "—" ? (
            <p className="mt-1 text-base font-semibold text-emerald-300 sm:text-lg">
              {metrics.distanceToManeuverLabel}
            </p>
          ) : null}
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
          <TripStat label="ETA" value={metrics.etaLabel} />
          <TripStat label="Remaining" value={metrics.distanceRemainingLabel} />
          <TripStat label="Progress" value={metrics.routeProgressLabel} />
        </div>
      </div>
    </div>
  );
}

export const NavigationDirectionBanner = memo(NavigationDirectionBannerComponent);
