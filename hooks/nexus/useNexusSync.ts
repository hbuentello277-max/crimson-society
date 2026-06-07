"use client";

import { useCallback, useState } from "react";
import { invalidateNexusClientFetchCache } from "@/lib/nexus/client-fetch";

type SyncResponse = {
  ok: boolean;
  synced_at?: string;
  errors?: string[];
  error?: string;
};

export function useNexusSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const sync = useCallback(async (): Promise<boolean> => {
    setSyncing(true);
    setToast(null);

    try {
      const response = await fetch("/api/nexus/sync", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as SyncResponse | null;

      if (!response.ok && !payload?.synced_at) {
        const message = payload?.error || `Sync failed (${response.status})`;
        setToast({ tone: "error", message });
        return false;
      }

      const syncedAt = payload?.synced_at ?? new Date().toISOString();
      setLastSyncedAt(syncedAt);
      invalidateNexusClientFetchCache();

      if (payload?.ok) {
        setToast({ tone: "success", message: "Nexus synced successfully." });
        return true;
      }

      const partial = payload?.errors?.length
        ? `Sync completed with warnings: ${payload.errors.slice(0, 2).join("; ")}`
        : "Sync completed with partial warnings.";
      setToast({ tone: "error", message: partial });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      setToast({ tone: "error", message });
      return false;
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    syncing,
    lastSyncedAt,
    toast,
    sync,
    clearToast,
  };
}
