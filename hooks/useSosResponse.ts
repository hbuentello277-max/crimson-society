"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearSosResponderLiveLocation,
  publishSosResponderLiveLocation,
  shouldShowArrivalAssist,
} from "@/lib/rider-sos/live-location";
import { RIDER_SOS_FEED_REFRESH_MS } from "@/lib/rider-sos/nearby-config";
import {
  loadMySosResponse,
  setSosResponse,
  setSosResponseWithLocation,
} from "@/lib/rider-sos/load-sos-responses";
import { requestCurrentPosition } from "@/lib/rider-sos/geolocation";
import type { RiderSosResponseRow, RiderSosResponseStatus } from "@/lib/rider-sos/response-types";
import { isActiveResponseStatus } from "@/lib/rider-sos/response-format";

export function useSosResponse(sosEventId: string | null, enabled: boolean) {
  const [response, setResponse] = useState<RiderSosResponseRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveSharing, setLiveSharing] = useState<"idle" | "active" | "unavailable">("idle");
  const [arrivalAssist, setArrivalAssist] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const stopLiveSharing = useCallback(
    async (options?: { clearRemote?: boolean }) => {
      if (watchIdRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      setArrivalAssist(false);
      setLiveSharing("idle");

      if (options?.clearRemote !== false && sosEventId) {
        try {
          await clearSosResponderLiveLocation(sosEventId);
        } catch {
          // Best-effort cleanup. The server also clears rows on arrived/cancelled/resolved.
        }
      }
    },
    [sosEventId],
  );

  const startLiveSharing = useCallback(
    (initialPosition: { latitude: number; longitude: number; accuracy?: number | null }) => {
      if (!sosEventId || typeof navigator === "undefined" || !navigator.geolocation) {
        setLiveSharing("unavailable");
        return;
      }

      void publishSosResponderLiveLocation(sosEventId, initialPosition)
        .then((location) => {
          setLiveSharing("active");
          setArrivalAssist(shouldShowArrivalAssist(location.distance_miles));
        })
        .catch(() => {
          setLiveSharing("unavailable");
        });

      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          void publishSosResponderLiveLocation(sosEventId, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          })
            .then((location) => {
              setLiveSharing("active");
              setArrivalAssist(shouldShowArrivalAssist(location.distance_miles));
            })
            .catch(() => {
              setLiveSharing("unavailable");
            });
        },
        () => {
          setLiveSharing("unavailable");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 15_000,
        },
      );
    },
    [sosEventId],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !sosEventId) {
      setResponse(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const row = await loadMySosResponse(sosEventId);
      setResponse(row);
      return row;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your response.");
      setResponse(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, sosEventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !sosEventId) return;

    const interval = window.setInterval(() => {
      void refresh();
    }, RIDER_SOS_FEED_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [enabled, refresh, sosEventId]);

  useEffect(() => {
    if (response?.status !== "responding") {
      void stopLiveSharing();
    }
  }, [response?.status, stopLiveSharing]);

  useEffect(() => {
    return () => {
      void stopLiveSharing();
    };
  }, [stopLiveSharing]);

  const updateStatus = useCallback(
    async (
      status: RiderSosResponseStatus,
      location?: { latitude: number | null; longitude: number | null; accuracy?: number | null },
    ) => {
      if (!sosEventId) return null;

      setSubmitting(true);
      setError(null);

      try {
        const row = location
          ? await setSosResponseWithLocation(sosEventId, status, location)
          : await setSosResponse(sosEventId, status);
        setResponse(row);

        if (status !== "responding") {
          void stopLiveSharing();
        }

        return row;
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Unable to update response.");
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [sosEventId],
  );

  return {
    response,
    isResponding: isActiveResponseStatus(response?.status),
    loading,
    submitting,
    error,
    refresh,
    respond: async () => {
      const location = await requestCurrentPosition(8000);
      const row = await updateStatus(
        "responding",
        location.ok
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
            }
          : {
              latitude: null,
              longitude: null,
              accuracy: null,
            },
      );

      if (location.ok && row?.status === "responding") {
        startLiveSharing({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        });
      } else if (!location.ok) {
        setLiveSharing("unavailable");
      }

      return row;
    },
    markArrived: () => updateStatus("arrived"),
    cancelResponse: () => updateStatus("cancelled"),
    liveSharing,
    stopLiveSharing: () => stopLiveSharing(),
    arrivalAssist,
  };
}
