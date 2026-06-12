"use client";

import { useCallback, useEffect, useState } from "react";
import { RIDER_SOS_FEED_REFRESH_MS } from "@/lib/rider-sos/nearby-config";
import { loadSosResponders } from "@/lib/rider-sos/load-sos-responses";
import type { RiderSosResponderView } from "@/lib/rider-sos/response-types";

export function useSosResponders(sosEventId: string | null, enabled: boolean) {
  const [responders, setResponders] = useState<RiderSosResponderView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !sosEventId) {
      setResponders([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const rows = await loadSosResponders(sosEventId);
      setResponders(rows);
      return rows;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load responders.");
      setResponders([]);
      return [];
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

  return { responders, loading, error, refresh };
}
