"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const RideMap = dynamic(() => import("@/components/RideMap"), {
  ssr: false,
});

type RoutePoint = {
  lat: number;
  lng: number;
};

type RideWaypoint = RoutePoint & {
  id: string;
  label: string;
};

type StoredRideData = {
  route?: unknown;
  waypoints?: unknown;
  name?: unknown;
  meetPoint?: unknown;
  destination?: unknown;
};

type ActiveRide = {
  route: RoutePoint[];
  waypoints: RideWaypoint[];
  name: string;
  meetPoint: string;
  destination: string;
};

function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "lat" in value &&
    "lng" in value &&
    typeof (value as RoutePoint).lat === "number" &&
    typeof (value as RoutePoint).lng === "number" &&
    Number.isFinite((value as RoutePoint).lat) &&
    Number.isFinite((value as RoutePoint).lng)
  );
}

function parseRoute(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(isRoutePoint);
}

function parseWaypoints(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is RideWaypoint => {
    return (
      isRoutePoint(item) &&
      "id" in item &&
      "label" in item &&
      typeof item.id === "string" &&
      typeof item.label === "string"
    );
  });
}

function parseStoredRide(stored: string | null): ActiveRide | null {
  if (!stored) return null;

  try {
    const rideData = JSON.parse(stored) as StoredRideData;
    const route = parseRoute(rideData.route);

    if (route.length === 0) return null;

    return {
      route,
      waypoints: parseWaypoints(rideData.waypoints),
      name: typeof rideData.name === "string" && rideData.name.trim() ? rideData.name : "Active ride",
      meetPoint:
        typeof rideData.meetPoint === "string" && rideData.meetPoint.trim()
          ? rideData.meetPoint
          : "Meet point",
      destination:
        typeof rideData.destination === "string" && rideData.destination.trim()
          ? rideData.destination
          : "Destination",
    };
  } catch (error) {
    console.error("Failed to load active ride:", error);
    return null;
  }
}

export default function RideTrackingPage() {
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("crimson-active-ride");
    setActiveRide(parseStoredRide(stored));
    setLoaded(true);
  }, []);

  const origin = activeRide?.route[0] ?? null;
  const hasRoute = !!activeRide && !!origin && activeRide.route.length > 0;
  const statusLabel = useMemo(() => (tracking ? "Tracking" : "Ready"), [tracking]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 44% at 50% 0%, rgba(104,0,11,0.42), transparent 58%), linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 34%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1080px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+28px)] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            Ride Tracking
          </p>

          <Link
            href="/rides"
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
          >
            Meets
          </Link>
        </div>

        {!loaded && (
          <section className="mt-8 flex flex-1 items-center justify-center">
            <p className="text-sm text-zinc-500">Loading ride...</p>
          </section>
        )}

        {loaded && !hasRoute && (
          <section className="mt-8 flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center shadow-[0_22px_60px_-38px_rgba(0,0,0,0.95)]">
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#d85f6c]">
                No Route Loaded
              </p>
              <h1 className="mt-3 font-serif text-[34px] leading-none text-[#f4f0ea]">
                No active ride selected.
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Open a meet and start ride tracking from its route details.
              </p>
              <Link
                href="/rides"
                className="mt-5 inline-flex rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/40"
              >
                Back to Meets
              </Link>
            </div>
          </section>
        )}

        {loaded && hasRoute && activeRide && origin && (
          <>
            <header className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">
                {statusLabel}
              </p>
              <h1 className="mt-3 font-serif text-[42px] leading-none text-[#f4f0ea] sm:text-6xl">
                {activeRide.name}
              </h1>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <RouteInfo label="Meet Point" value={activeRide.meetPoint} />
                <RouteInfo label="Destination" value={activeRide.destination} />
              </div>
            </header>

            <section className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]">
              <RideMap
                lat={origin.lat}
                lng={origin.lng}
                meetPoint={activeRide.meetPoint}
                route={activeRide.route}
                height={420}
                interactive
                hideHint
                showDestination={activeRide.route.length > 1}
                showWaypoints={activeRide.waypoints.length > 0}
                waypoints={activeRide.waypoints}
              />
            </section>

            <section className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  Tracking Controls
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  GPS tracking controls are staged here while live telemetry is finalized.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTracking((current) => !current)}
                className={`rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition ${
                  tracking
                    ? "border-white/15 bg-white/[0.03] text-zinc-300 hover:border-white/25"
                    : "border-[#7f111b]/70 bg-[#7f111b]/25 text-[#f4dadd] hover:bg-[#7f111b]/40"
                }`}
              >
                {tracking ? "Stop Tracking" : "Start Tracking"}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function RouteInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3">
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">{label}</p>
      <p className="mt-1 text-sm text-zinc-300">{value}</p>
    </div>
  );
}
