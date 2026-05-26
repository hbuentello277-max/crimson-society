"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDistanceMiles, getRouteDistanceMiles } from "@/lib/gps/distance";
import { getAverageSpeedMph, getSegmentSpeedMph, metersPerSecondToMph } from "@/lib/gps/speed";
import { createRideTrackingPoint } from "@/lib/rides/tracking";
import type { RideTrackingPoint, RideTrackingStats, RideTrackingStatus } from "@/types/rides";

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 12000,
};

export function useRideTracking() {
  const [status, setStatus] = useState<RideTrackingStatus>("idle");
  const [routePoints, setRoutePoints] = useState<RideTrackingPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedBeforePause, setElapsedBeforePause] = useState(0);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const watchIdRef = useRef<number | null>(null);

  const clearTrackingWatch = useCallback(() => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    setRoutePoints((points) => {
      const previous = points.at(-1);
      const gpsSpeed = metersPerSecondToMph(position.coords.speed);
      const segmentSpeed =
        previous && position.timestamp > previous.timestamp
          ? getSegmentSpeedMph(
              getDistanceMiles(previous, {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }),
              previous.timestamp,
              position.timestamp
            )
          : 0;
      const speedMph = gpsSpeed > 0 ? gpsSpeed : segmentSpeed;

      return [...points, createRideTrackingPoint(position, speedMph)];
    });
  }, []);

  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("GPS is not available on this device.");
      setStatus("idle");
      return;
    }

    clearTrackingWatch();
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (positionError) => {
        setError(positionError.message || "Unable to read your GPS position.");
        if (status === "requesting") setStatus("idle");
      },
      WATCH_OPTIONS
    );
  }, [clearTrackingWatch, handlePosition, status]);

  const requestPermission = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("GPS is not available on this device.");
      return;
    }

    setStatus("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const startedAt = Date.now();
        handlePosition(position);
        setElapsedBeforePause(0);
        setActiveStartedAt(startedAt);
        setNow(startedAt);
        setStatus("active");
        startWatch();
      },
      (positionError) => {
        setStatus("idle");
        setError(positionError.message || "Location permission was not granted.");
      },
      WATCH_OPTIONS
    );
  }, [handlePosition, startWatch]);

  const startRide = useCallback(() => {
    if (status === "paused") {
      const startedAt = Date.now();
      setActiveStartedAt(startedAt);
      setNow(startedAt);
      setStatus("active");
      startWatch();
      return;
    }

    setRoutePoints([]);
    requestPermission();
  }, [requestPermission, startWatch, status]);

  const pauseRide = useCallback(() => {
    if (status !== "active") return;
    clearTrackingWatch();
    setElapsedBeforePause((elapsed) => elapsed + (activeStartedAt ? Date.now() - activeStartedAt : 0));
    setActiveStartedAt(null);
    setStatus("paused");
  }, [activeStartedAt, clearTrackingWatch, status]);

  const stopRide = useCallback(() => {
    clearTrackingWatch();
    setElapsedBeforePause((elapsed) => elapsed + (activeStartedAt ? Date.now() - activeStartedAt : 0));
    setActiveStartedAt(null);
    setStatus("stopped");
  }, [activeStartedAt, clearTrackingWatch]);

  const resetRide = useCallback(() => {
    clearTrackingWatch();
    setRoutePoints([]);
    setError(null);
    setElapsedBeforePause(0);
    setActiveStartedAt(null);
    setStatus("idle");
  }, [clearTrackingWatch]);

  useEffect(() => {
    if (status !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => clearTrackingWatch, [clearTrackingWatch]);

  const stats = useMemo<RideTrackingStats>(() => {
    const distanceMiles = getRouteDistanceMiles(routePoints);
    const durationMs = elapsedBeforePause + (activeStartedAt ? now - activeStartedAt : 0);
    const currentSpeedMph = routePoints.at(-1)?.speedMph ?? 0;
    const topSpeedMph = routePoints.reduce((top, point) => Math.max(top, point.speedMph), 0);

    return {
      currentSpeedMph,
      topSpeedMph,
      averageSpeedMph: getAverageSpeedMph(distanceMiles, durationMs),
      distanceMiles,
      durationMs,
    };
  }, [activeStartedAt, elapsedBeforePause, now, routePoints]);

  return {
    error,
    routePoints,
    stats,
    status,
    pauseRide,
    resetRide,
    startRide,
    stopRide,
  };
}
