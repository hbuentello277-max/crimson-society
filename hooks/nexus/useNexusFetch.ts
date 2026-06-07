"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";

type NexusFetchState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useNexusFetch<T>(path: string | null): NexusFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const refresh = useCallback(
    async (options?: { bypassCache?: boolean }) => {
      if (!path) {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await fetchNexusClientJson<T>(path, {
          bypassCache: options?.bypassCache ?? false,
        });
        setData(payload);
      } catch (fetchError) {
        setData(null);
        setError(fetchError instanceof Error ? fetchError.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const forceRefresh = useCallback(async () => {
    await refresh({ bypassCache: true });
  }, [refresh]);

  return { data, error, loading, refresh: forceRefresh };
}
