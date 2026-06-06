"use client";

import { useCallback, useState } from "react";

type DeleteResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function useNexusDelete() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(
    async <T>(path: string, key?: string): Promise<DeleteResult<T>> => {
      const actionKey = key ?? path;
      setPendingKey(actionKey);
      setError(null);

      try {
        const response = await fetch(path, {
          method: "DELETE",
          credentials: "include",
        });

        const payload = (await response.json().catch(() => null)) as
          | (T & { error?: string })
          | { error?: string }
          | null;

        if (!response.ok) {
          const message =
            (payload && "error" in payload && payload.error) ||
            `Request failed (${response.status})`;
          setError(message);
          return { ok: false, error: message };
        }

        return { ok: true, data: payload as T };
      } catch (deleteError) {
        const message = deleteError instanceof Error ? deleteError.message : "Request failed";
        setError(message);
        return { ok: false, error: message };
      } finally {
        setPendingKey(null);
      }
    },
    [],
  );

  const isPending = useCallback((key: string) => pendingKey === key, [pendingKey]);

  return { remove, pendingKey, isPending, error, clearError: () => setError(null) };
}
