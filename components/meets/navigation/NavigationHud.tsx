import { memo } from "react";
import type { NavigationMetrics, NavigationSession } from "@/lib/meets/navigation/types";

type NavigationHudProps = {
  session: NavigationSession;
  onRecenter: () => void;
  onRetryGps: () => void;
  onTogglePause: () => void;
  canRecenter: boolean;
};

type MetricTileProps = {
  label: string;
  value: string;
  emphasis?: boolean;
};

function MetricTile({ label, value, emphasis = false }: MetricTileProps) {
  return (
    <div
      className={
        emphasis
          ? "col-span-2 rounded-xl border border-[#b4141e]/35 bg-[#14080b]/90 px-3 py-3 sm:col-span-3"
          : "rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
      }
    >
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p
        className={
          emphasis
            ? "mt-1 text-base font-medium leading-snug text-[#f4dadd]"
            : "mt-1 text-sm font-medium text-zinc-100"
        }
      >
        {value}
      </p>
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
  const { metrics, meet, route, navigationState, error, shareError, isPaused } = session;

  const showGpsAlert =
    navigationState === "gps_permission_required" ||
    navigationState === "error" ||
    !!error;

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-[600]">
      <div className="pointer-events-auto mx-auto grid max-w-md gap-3 rounded-2xl border border-white/10 bg-black/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <HudMetricsGrid metrics={metrics} />

        {route && meet ? (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Route</p>
            <p className="mt-1 text-sm text-zinc-200">
              {route.meetPoint} → {route.destination}
            </p>
            {meet.trackingStatus !== "active" ? (
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Personal GPS navigation is active. Live meet sharing opens when the host starts the
                meet.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Meet is live. Your location is shown on this map and shared with the group.
              </p>
            )}
          </div>
        ) : null}

        {showGpsAlert ? (
          <div className="rounded-xl border border-[#b4141e]/50 bg-[#10080a]/90 px-4 py-3 text-sm leading-5 text-[#f0c9ce]">
            {error ?? "GPS permission is required for navigation."}
          </div>
        ) : null}

        {shareError ? (
          <div className="rounded-xl border border-[#b4141e]/40 bg-[#10080a]/70 px-4 py-3 text-xs leading-5 text-[#f0c9ce]">
            {shareError}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onRecenter}
            disabled={!canRecenter}
            className="rounded-xl border border-white/10 px-3 py-3 text-[10px] uppercase tracking-[0.14em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7] disabled:cursor-not-allowed disabled:text-zinc-600"
          >
            Recenter
          </button>
          <button
            type="button"
            onClick={onRetryGps}
            className="rounded-xl border border-[#b4141e]/70 bg-[#b4141e]/25 px-3 py-3 text-[10px] uppercase tracking-[0.14em] text-[#f4dadd] transition hover:bg-[#b4141e]/40"
          >
            {navigationState === "gps_permission_required" || navigationState === "error"
              ? "Retry GPS"
              : "Refresh GPS"}
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="rounded-xl border border-white/10 px-3 py-3 text-[10px] uppercase tracking-[0.14em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <MetricTile label="Next Turn" value={metrics.nextTurnLabel} emphasis />
      <MetricTile label="To Maneuver" value={metrics.distanceToManeuverLabel} />
      <MetricTile label="Remaining" value={metrics.distanceRemainingLabel} />
      <MetricTile label="Time Left" value={metrics.timeRemainingLabel} />
      <MetricTile label="Speed" value={metrics.currentSpeedLabel} />
      <MetricTile label="Progress" value={metrics.routeProgressLabel} />
    </div>
  );
}

export const NavigationHud = memo(NavigationHudComponent);
