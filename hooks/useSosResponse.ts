"use client";

import { useCallback, useEffect, useState } from "react";
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
      return updateStatus(
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
    },
    markArrived: () => updateStatus("arrived"),
    cancelResponse: () => updateStatus("cancelled"),
  };
}
