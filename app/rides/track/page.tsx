"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const RideMap = dynamic(() => import("@/components/RideMap"), {
  ssr: false,
});

type TrackingState =
  | "idle"
  | "requesting_permission"
  | "denied"
  | "unavailable"
  | "searching"
  | "tracking"
  | "paused"
  | "stopped";

type Position = {
  lat: number;
  lng: number;
  timestamp: number;
};

type RoutePoint = {
  lat: number;
  lng: number;
};

type StoredRideRoutePoint = {
  lat: number;
  lng: number;
};

type StoredRideData = {
  route?: StoredRideRoutePoint[];
  name?: string;
};

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) *
      Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function checkOffRoute(
  currentPos: Position,
  plannedRoute: RoutePoint[],
): boolean {
  if (!plannedRoute.length) return false;

  const THRESHOLD_METERS = 150;

  for (const point of plannedRoute) {
    const distance = haversineDistance(
      currentPos.lat,
      currentPos.lng,
      point.lat,
      point.lng,
    );

    if (distance <= THRESHOLD_METERS) {
      return false;
    }
  }

  return true;
}

export default function RideTrackingPage() {
  const router = useRouter();

  const [state, setState] = useState<TrackingState>("idle");
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPos, setCurrentPos] = useState<Position | null>(null);

  const [speed, setSpeed] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const [isOffRoute, setIsOffRoute] = useState<boolean>(false);

  const [plannedRoute, setPlannedRoute] = useState<RoutePoint[] | null>(null);

  const [, setRideName] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);

  const startTimeRef = useRef<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function handleStart() {
    if (!navigator.geolocation) {
      setState("unavailable");
      return;
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

      if (
        state === "requesting_permission" ||
        state === "searching"
      ) {
        setState("tracking");

        startTimeRef.current = Date.now();
      }

      if (plannedRoute && checkOffRoute(newPos, plannedRoute)) {
        setIsOffRoute(true);
      } else {
        setIsOffRoute(false);
      }
    };

    const error = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setState("denied");
      } else {
        setState("searching");
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      success,
      error,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
  }

  function handlePause() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);

      watchIdRef.current = null;
    }

    setState("paused");
  }

  function handleResume() {
    handleStart();
  }

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

  useEffect(() => {
    if (
      state === "tracking" &&
      startTimeRef.current !== null
    ) {
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = sessionStorage.getItem(
      "crimson-active-ride",
    );

    if (!stored) return;

    let cancelled = false;

    const timer = window.setTimeout(() => {
      try {
        const rideData: StoredRideData = JSON.parse(stored);

        let nextRoute: RoutePoint[] | null = null;

        let nextRideName: string | null = null;

        if (
          Array.isArray(rideData.route) &&
          rideData.route.length > 0
        ) {
          const validRoute = rideData.route.every(
            (p: StoredRideRoutePoint) =>
              typeof p.lat === "number" &&
              typeof p.lng === "number" &&
              Number.isFinite(p.lat) &&
              Number.isFinite(p.lng),
          );

          if (validRoute) {
            nextRoute = rideData.route;
          }
        }

        if (rideData.name) {
          nextRideName = rideData.name;
        }

        if (!cancelled) {
          if (nextRoute) {
            setPlannedRoute(nextRoute);
          }

          if (nextRideName) {
            setRideName(nextRideName);
          }
        }
      } catch (e) {
        console.error(
          "Failed to load planned route:",
          e,
        );
      }
    }, 0);

    return () => {
      cancelled = true;

      window.clearTimeout(timer);
    };
  }, []);

  const speedMph = (speed * 2.23694).toFixed(1);

  const elapsedSec = Math.floor(elapsedMs / 1000);

  const mins = Math.floor(elapsedSec / 60);

  const secs = elapsedSec % 60;

  return (
    <div className="min-h-screen bg-[#0a0506] flex flex-col">
      {/* Keep the rest of your JSX exactly as-is below this point */}
    </div>
  );
}