"use client";

import Link from "next/link";
import { TrackerControls } from "@/components/rides/tracker/TrackerControls";
import { TrackerMap } from "@/components/rides/tracker/TrackerMap";
import { TrackerStats } from "@/components/rides/tracker/TrackerStats";
import { useRideTracking } from "@/hooks/useRideTracking";

const statusCopy = {
  idle: "Ready for GPS",
  requesting: "Requesting permission",
  active: "Tracking live",
  paused: "Ride paused",
  stopped: "Ride stopped",
};

export default function RideTrackPage() {
  const {
    error,
    routePoints,
    stats,
    status,
    pauseRide,
    resetRide,
    startRide,
    stopRide,
  } = useRideTracking();

  const currentPoint = routePoints.at(-1);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 42% at 50% 0%, rgba(104,0,11,0.44), transparent 58%), linear-gradient(180deg, rgba(127,17,27,0.07) 0%, rgba(0,0,0,0) 34%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(127,17,27,0.84)] to-transparent"
      />

      <div className="relative mx-auto flex min-h-screen max-w-[980px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-[calc(env(safe-area-inset-top)+24px)] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/rides"
            className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-[#7f111b]/60 hover:text-white"
          >
            Rides
          </Link>
          <span className="rounded-lg border border-[#7f111b]/45 bg-[#7f111b]/18 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0c9ce]">
            {statusCopy[status]}
          </span>
        </div>

        <header className="mt-7">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">
            Crimson Ride Tracking
          </p>
          <h1 className="mt-3 font-serif text-[42px] leading-none text-[#f4f0ea] sm:text-6xl">
            Track the Run
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Phase 1 keeps every route point on this device only. No database writes, no ride
            history, no persistence.
          </p>
        </header>

        <div className="mt-6 space-y-4">
          <TrackerStats stats={stats} />

          <TrackerControls
            status={status}
            onPause={pauseRide}
            onReset={resetRide}
            onStart={startRide}
            onStop={stopRide}
          />

          {error && (
            <div className="rounded-lg border border-[#7f111b]/55 bg-[#7f111b]/16 px-4 py-3 text-sm leading-6 text-[#f0c9ce]">
              {error}
            </div>
          )}

          <TrackerMap points={routePoints} statusLabel={statusCopy[status]} />

          <section className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">GPS Points</p>
              <p className="mt-1 text-lg text-zinc-100">{routePoints.length}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Accuracy</p>
              <p className="mt-1 text-lg text-zinc-100">
                {currentPoint?.accuracy ? `${Math.round(currentPoint.accuracy)} m` : "--"}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Current Fix</p>
              <p className="mt-1 truncate text-sm text-zinc-100">
                {currentPoint ? `${currentPoint.lat}, ${currentPoint.lng}` : "Awaiting GPS"}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
