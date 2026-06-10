"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import {
  GPS_SIGNAL_LOST_MESSAGE,
  GPS_STALE_CHECK_INTERVAL_MS,
  logGpsRecoveryAttempt,
  shouldTriggerStaleGpsRecovery,
} from "@/lib/meets/navigation/gps-stale-recovery";

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 12000,
};

export type NavigationGpsState =
  | "idle"
  | "requesting"
  | "active"
  | "recovering"
  | "denied"
  | "unavailable"
  | "error";

type UseNavigationGpsOptions = {
  enabled?: boolean;
  onPosition?: (position: GeolocationPosition) => void;
};

export function useNavigationGps(options: UseNavigationGpsOptions = {}) {
  const { enabled = true, onPosition } = options;
  const onPositionRef = useRef(onPosition);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateAtMsRef = useRef<number | null>(null);
  const lastRecoveryAtMsRef = useRef<number | null>(null);

  const [gpsState, setGpsState] = useState<NavigationGpsState>("idle");
  const [userLocation, setUserLocation] = useState<RoutePoint | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [recenterSignal, setRecenterSignal] = useState(0);

  useEffect(() => {
    onPositionRef.current = onPosition;
  }, [onPosition]);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const nextLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    lastUpdateAtMsRef.current = Date.now();
    setUserLocation(nextLocation);
    setGpsState("active");
    setGpsError(null);
    onPositionRef.current?.(position);
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) {
      clearWatch();
      setGpsState("denied");
      setGpsError("Location permission was denied. Enable GPS to navigate this meet.");
      return;
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      setGpsState("error");
      setGpsError("GPS signal is weak. Move to an open area — tracking will resume automatically.");
      return;
    }

    if (error.code === error.TIMEOUT) {
      setGpsState("error");
      setGpsError("GPS timed out. Waiting for the next location update.");
      return;
    }

    setGpsState("error");
    setGpsError(error.message || "Unable to read your location.");
  }, [clearWatch]);

  const beginWatchFromCurrentPosition = useCallback(
    (options: { recovering?: boolean } = {}) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setGpsState("unavailable");
        setGpsError("GPS is not available on this device.");
        return;
      }

      if (options.recovering) {
        setGpsState("recovering");
        setGpsError(GPS_SIGNAL_LOST_MESSAGE);
      } else {
        setGpsState("requesting");
        setGpsError(null);
      }

      clearWatch();

      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePosition(position);
          setRecenterSignal((value) => value + 1);
          watchIdRef.current = navigator.geolocation.watchPosition(
            handlePosition,
            handleError,
            WATCH_OPTIONS,
          );
        },
        handleError,
        WATCH_OPTIONS,
      );
    },
    [clearWatch, handleError, handlePosition],
  );

  const requestGps = useCallback(() => {
    if (!enabled) return;
    beginWatchFromCurrentPosition({ recovering: false });
  }, [beginWatchFromCurrentPosition, enabled]);

  const recoverStaleGps = useCallback(() => {
    if (!enabled) return;

    const nowMs = Date.now();
    lastRecoveryAtMsRef.current = nowMs;
    logGpsRecoveryAttempt({
      lastUpdateAtMs: lastUpdateAtMsRef.current,
      lastRecoveryAtMs: nowMs,
    });
    beginWatchFromCurrentPosition({ recovering: true });
  }, [beginWatchFromCurrentPosition, enabled]);

  useEffect(() => {
    return () => {
      clearWatch();
    };
  }, [clearWatch]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const checkStaleGps = () => {
      const nowMs = Date.now();
      if (
        !shouldTriggerStaleGpsRecovery({
          enabled,
          gpsState,
          lastUpdateAtMs: lastUpdateAtMsRef.current,
          lastRecoveryAtMs: lastRecoveryAtMsRef.current,
          nowMs,
        })
      ) {
        return;
      }

      recoverStaleGps();
    };

    const intervalId = window.setInterval(checkStaleGps, GPS_STALE_CHECK_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, gpsState, recoverStaleGps]);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const resumeOnVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (gpsState === "denied" || gpsState === "unavailable") return;
      if (watchIdRef.current !== null) return;
      requestGps();
    };

    document.addEventListener("visibilitychange", resumeOnVisible);
    return () => {
      document.removeEventListener("visibilitychange", resumeOnVisible);
    };
  }, [enabled, gpsState, requestGps]);

  const recenter = useCallback(() => {
    setRecenterSignal((value) => value + 1);
  }, []);

  return {
    gpsState,
    userLocation,
    gpsError,
    requestGps,
    recenter,
    recenterSignal,
    clearWatch,
  };
}
