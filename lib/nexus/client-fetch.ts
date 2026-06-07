/**
 * Client-side dedupe + short-lived cache for owner Nexus read fetches.
 * Sync/manual refresh bypasses or clears this cache.
 */

const NEXUS_CLIENT_FETCH_TTL_MS = 20_000;

type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export function invalidateNexusClientFetchCache(path?: string): void {
  if (!path) {
    cache.clear();
    return;
  }

  cache.delete(path);
}

export async function fetchNexusClientJson<T>(
  path: string,
  options?: { bypassCache?: boolean },
): Promise<T> {
  const bypassCache = options?.bypassCache ?? false;
  const now = Date.now();

  if (!bypassCache) {
    const cached = cache.get(path);
    if (cached && cached.expiresAt > now) {
      return cached.data as T;
    }
  }

  const pending = inflight.get(path);
  if (pending && !bypassCache) {
    return pending as Promise<T>;
  }

  const request = (async () => {
    const response = await fetch(path, { credentials: "include", cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: string })
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(
        (payload && typeof payload === "object" && "error" in payload && payload.error) ||
          `Request failed (${response.status})`,
      );
    }

    cache.set(path, {
      data: payload,
      expiresAt: Date.now() + NEXUS_CLIENT_FETCH_TTL_MS,
    });

    return payload as T;
  })();

  inflight.set(path, request);

  try {
    return (await request) as T;
  } finally {
    inflight.delete(path);
  }
}
