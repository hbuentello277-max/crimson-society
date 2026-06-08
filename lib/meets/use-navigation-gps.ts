"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoutePoint } from "@/lib/meets/route-geometry";

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 12000,
};

export type NavigationGpsState =
  | "idle"
  | "requesting"
  | "active"
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
    setUserLocation(nextLocation);
    setGpsState("active");
    setGpsError(null);
    onPositionRef.current?.(position);
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    clearWatch();

    if (error.code === error.PERMISSION_DENIED) {
      setGpsState("denied");
      setGpsError("Location permission was denied. Enable GPS to navigate this meet.");
      return;
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      setGpsState("error");
      setGpsError("GPS signal is unavailable. Move to an open area and try again.");
      return;
    }

    setGpsState("error");
    setGpsError(error.message || "Unable to read your location.");
  }, [clearWatch]);

  const requestGps = useCallback(() => {
    if (!enabled) return;

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGpsState("unavailable");
      setGpsError("GPS is not available on this device.");
      return;
    }

    setGpsState("requesting");
    setGpsError(null);
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
  }, [clearWatch, enabled, handleError, handlePosition]);

  useEffect(() => {
    return () => {
      clearWatch();
    };
  }, [clearWatch]);

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
