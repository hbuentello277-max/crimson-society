"use client";

import { useCallback, useEffect, useState } from "react";
import { RIDER_SOS_FEED_REFRESH_MS, RIDER_SOS_NEARBY_RADIUS_MILES } from "@/lib/rider-sos/nearby-config";
import { requestCurrentPosition } from "@/lib/rider-sos/geolocation";
import { loadNearbyActiveSosAlerts } from "@/lib/rider-sos/load-nearby-alerts";
import type { NearbyRiderSosAlert } from "@/lib/rider-sos/nearby-types";

type ViewerLocation = {
  lat: number;
  lng: number;
} | null;

export function useNearbyActiveSos(enabled: boolean) {
  const [alerts, setAlerts] = useState<NearbyRiderSosAlert[]>([]);
  const [viewerLocation, setViewerLocation] = useState<ViewerLocation>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setAlerts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let viewer = viewerLocation;

      if (!viewer) {
        const position = await requestCurrentPosition(8000);
        if (position.ok) {
          viewer = { lat: position.latitude, lng: position.longitude };
          setViewerLocation(viewer);
          setLocationNote(null);
        } else {
          setLocationNote("Enable location to filter nearby SOS alerts by distance.");
        }
      }

      const rows = await loadNearbyActiveSosAlerts(viewer, RIDER_SOS_NEARBY_RADIUS_MILES);
      setAlerts(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load SOS alerts.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, viewerLocation]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    const interval = window.setInterval(() => {
      void refresh();
    }, RIDER_SOS_FEED_REFRESH_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refresh]);

  return {
    alerts,
    loading,
    error,
    locationNote,
    refresh,
  };
}
