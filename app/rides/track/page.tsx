"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const RideMap = dynamic(() => import("@/components/RideMap"), { ssr: false });

type TrackingState =
  | "idle"
  | "requesting_permission"
  | "denied"
  | "unavailable"
  | "searching"
  | "tracking"
  | "paused"
  | "stopped";

type Position = { lat: number; lng: number; timestamp: number };

type RoutePoint = { lat: number; lng: number };

// Helper functions for off-route detection
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkOffRoute(
  currentPos: Position,
  plannedRoute: RoutePoint[]
): boolean {
  if (!plannedRoute || plannedRoute.length === 0) return false;
  const THRESHOLD_METERS = 150;
  for (const point of plannedRoute) {
    const distance = haversineDistance(
      currentPos.lat,
      currentPos.lng,
      point.lat,
      point.lng
    );
    if (distance <= THRESHOLD_METERS) return false;
  }
  return true;
}

export default function RideTrackingPage() {
  const router = useRouter();
    const [state, setState] = useState<TrackingState>("idle")
    const [positions, setPositions] = useState<Position[]>([]);
  const [speed, setSpeed] = useState<number>(0)
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isOffRoute, setIsOffRoute] = useState<boolean>(false);

    // Phase 3B: Planned route tracking
  const [plannedRoute, setPlannedRoute] = useState<RoutePoint[] | null>(null);
  const [rideName, setRideName] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start tracking
  function handleStart() {
    if (!navigator.geolocation) {
      setState("unavailable");
      return;
        // Phase 3B: Off-route detection helpers
  function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  function checkOffRoute(
    currentPos: Position,
    plannedRoute: RoutePoint[]
  ): boolean {
    if (!plannedRoute || plannedRoute.length === 0) return false;
    const THRESHOLD_METERS = 150;

    for (const point of plannedRoute) {
      const distance = haversineDistance(
        currentPos.lat,
        currentPos.lng,
        point.lat,
        point.lng
      );
      if (distance <= THRESHOLD_METERS) return false;
    }
    return true;
  }

    }

    setState("requesting_permission");

    const success = (pos: GeolocationPosition) => {
      const newPos: Position = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: Date.now(),
      };

      setCurrentPos(newPos);
      setPositions((prev) => [...prev, newPos]);
      setSpeed(pos.coords.speed ?? 0);
      setAccuracy(pos.coords.accuracy);

      if (state === "requesting_permission" || state === "searching") {
        setState("tracking");
        startTimeRef.current = Date.now();
      }

    if (plannedRoute && checkOffRoute(newPos, plannedRoute)) {
      setIsOffRoute(true);
    } else {
      setIsOffRoute(false);
    }    };

    const error = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setState("denied");
      } else {
        setState("searching");
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  }

  // Pause tracking
  function handlePause() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState("paused");
  }

  // Resume tracking
  function handleResume() {
    handleStart();
  }

  // Stop tracking
  function handleStop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState("stopped");
  }

  // Timer effect
  useEffect(() => {
    if (state === "tracking" && startTimeRef.current !== null) {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current!);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

    // Phase 3B: Load planned route from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("crimson-active-ride");
    if (!stored) return;

    try {
      const rideData = JSON.parse(stored);
      
      // Validate route structure
      if (Array.isArray(rideData.route) && rideData.route.length > 0) {
        const validRoute = rideData.route.every(
          (p: any) =>
            typeof p.lat === "number" &&
            typeof p.lng === "number" &&
            isFinite(p.lat) &&
            isFinite(p.lng)
        );
        if (validRoute) {
          setPlannedRoute(rideData.route);
        }
      }
      
      if (rideData.name) {
        setRideName(rideData.name);
      }
    } catch (e) {
      console.error("Failed to load planned route:", e);
    }
  }, []);

  const speedMph = (speed * 2.23694).toFixed(1); // m/s to mph
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;

  return (
    <div className="min-h-screen bg-[#0a0506] flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-[#0d0608] px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between">
          <Link
            href="/rides"
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 13L5 8l5-5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm uppercase tracking-[0.18em]">Rides</span>
          </Link>
          <h1 className="text-sm uppercase tracking-[0.18em] text-zinc-300">
            Ride Tracking Assist
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        {currentPos ? (
          <RideMap
            lat={currentPos.lat}
            lng={currentPos.lng}
            meetPoint="Current Location"
            route={positions.map((p) => ({ lat: p.lat, lng: p.lng }))}
            height={600}
            interactive
            hideHint
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#080506] text-zinc-600 text-xs uppercase tracking-wider">
            GPS Not Active
          </div>
        )}

        {/* HUD Overlay */}
        <div className="absolute inset-x-4 top-4 pointer-events-none">
          {/* Status */}
          <div className="flex justify-between items-start mb-3">
            <div className="rounded-full border border-white/15 bg-black/70 backdrop-blur-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-300">
              {state === "idle" && "Ready"}
              {state === "requesting_permission" && "Requesting GPS..."}
              {state === "denied" && "GPS Denied"}
              {state === "unavailable" && "GPS Unavailable"}
              {state === "searching" && "Searching GPS..."}
              {state === "tracking" && "Tracking"}
              {state === "paused" && "Paused"}
              {state === "stopped" && "Stopped"}
            </div>
            {accuracy !== null && state === "tracking" && (
              <div className="rounded-full border border-white/15 bg-black/70 backdrop-blur-sm px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                ±{Math.round(accuracy)}m
              </div>
            )}
          </div>

          {/* Off-Route Warning Placeholder */}
          {isOffRoute && plannedRoute && (
            <div className="rounded-xl border border-[#7f111b]/60 bg-[#7f111b]/20 backdrop-blur-sm px-4 py-3 mb-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#f4dadd] mb-1">
                Route Monitor
              </p>
              <p className="text-xs text-zinc-300">
                You may be off-route. Full navigation coming soon.
              </p>
            </div>
          )}
        </div>

        {/* Speed + Timer */}
        {(state === "tracking" || state === "paused") && (
          <div className="absolute bottom-44 inset-x-4 pointer-events-none">
            <div className="flex gap-3">
              {/* Speed */}
              <div className="flex-1 rounded-2xl border border-white/15 bg-black/80 backdrop-blur-md px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">
                  Speed
                </p>
                <p className="text-4xl font-bold text-white tabular-nums">
                  {speedMph}
                </p>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mt-0.5">
                  MPH
                </p>
              </div>

              {/* Timer */}
              <div className="flex-1 rounded-2xl border border-white/15 bg-black/80 backdrop-blur-md px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">
                  Time
                </p>
                <p className="text-4xl font-bold text-white tabular-nums">
                  {mins.toString().padStart(2, "0")}:
                  {secs.toString().padStart(2, "0")}
                </p>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mt-0.5">
                  Elapsed
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Coordinates (when tracking) */}
        {currentPos && (state === "tracking" || state === "paused") && (
          <div className="absolute bottom-[9.5rem] inset-x-4 pointer-events-none">
            <div className="rounded-lg border border-white/10 bg-black/70 backdrop-blur-sm px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600 text-center">
                {currentPos.lat.toFixed(6)}, {currentPos.lng.toFixed(6)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 border-t border-white/10 bg-[#0d0608] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
        {state === "idle" && (
          <button
            onClick={handleStart}
            className="w-full rounded-xl border border-[#7f111b]/60 bg-[#7f111b]/20 py-4 text-sm uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#7f111b]/30"
          >
            Start Tracking
          </button>
        )}

        {(state === "requesting_permission" || state === "searching") && (
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7f111b] border-t-transparent" />
          </div>
        )}

        {state === "denied" && (
          <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 mb-2">
              GPS Permission Denied
            </p>
            <p className="text-xs text-zinc-500">
              Enable location access in your browser settings to track your ride.
            </p>
            <button
              onClick={() => router.push("/rides")}
              className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 py-2.5 text-xs uppercase tracking-[0.18em] text-zinc-300"
            >
              Back to Rides
            </button>
          </div>
        )}

        {state === "unavailable" && (
          <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 mb-2">
              GPS Unavailable
            </p>
            <p className="text-xs text-zinc-500">
              Your device does not support GPS tracking.
            </p>
            <button
              onClick={() => router.push("/rides")}
              className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 py-2.5 text-xs uppercase tracking-[0.18em] text-zinc-300"
            >
              Back to Rides
            </button>
          </div>
        )}

        {state === "tracking" && (
          <div className="flex gap-3">
            <button
              onClick={handlePause}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 py-3.5 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-white/10"
            >
              Pause
            </button>
            <button
              onClick={handleStop}
              className="flex-1 rounded-xl border border-[#7f111b]/60 bg-[#7f111b]/20 py-3.5 text-xs uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#7f111b]/30"
            >
              Stop
            </button>
          </div>
        )}

        {state === "paused" && (
          <div className="flex gap-3">
            <button
              onClick={handleResume}
              className="flex-1 rounded-xl border border-[#7f111b]/60 bg-[#7f111b]/20 py-3.5 text-xs uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#7f111b]/30"
            >
              Resume
            </button>
            <button
              onClick={handleStop}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 py-3.5 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-white/10"
            >
              Stop
            </button>
          </div>
        )}

        {state === "stopped" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1">
                Ride Complete
              </p>
              <p className="text-lg font-semibold text-white">
                {mins.toString().padStart(2, "0")}:
                {secs.toString().padStart(2, "0")}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {positions.length} GPS points recorded
              </p>
            </div>
            <button
              onClick={() => router.push("/rides")}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-3.5 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-white/10"
            >
              Back to Rides
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
