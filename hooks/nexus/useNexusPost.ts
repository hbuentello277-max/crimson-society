"use client";

import { useCallback, useState } from "react";

type PostResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function useNexusPost() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(
    async <T>(
      path: string,
      body: Record<string, unknown>,
      key?: string,
    ): Promise<PostResult<T>> => {
      const actionKey = key ?? path;
      setPendingKey(actionKey);
      setError(null);

      try {
        const response = await fetch(path, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
      } catch (postError) {
        const message = postError instanceof Error ? postError.message : "Request failed";
        setError(message);
        return { ok: false, error: message };
      } finally {
        setPendingKey(null);
      }
    },
    [],
  );

  const isPending = useCallback((key: string) => pendingKey === key, [pendingKey]);

  return { post, pendingKey, isPending, error, clearError: () => setError(null) };
}
