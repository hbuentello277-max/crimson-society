"use client";

import { useCallback, useEffect, useState } from "react";

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

  const refresh = useCallback(async () => {
    if (!path) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(path, { credentials: "include", cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | (T & { error?: string })
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          (payload && "error" in payload && payload.error) ||
            `Request failed (${response.status})`,
        );
      }

      setData(payload as T);
    } catch (fetchError) {
      setData(null);
      setError(fetchError instanceof Error ? fetchError.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}
