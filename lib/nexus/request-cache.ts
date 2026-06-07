import type { SupabaseClient } from "@supabase/supabase-js";

const store = new WeakMap<SupabaseClient, Map<string, Promise<unknown>>>();

/**
 * Dedupe async loaders within a single API request (same Supabase client instance).
 */
export function runCached<T>(
  supabase: SupabaseClient,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  let map = store.get(supabase);
  if (!map) {
    map = new Map();
    store.set(supabase, map);
  }

  const existing = map.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = loader().catch((error) => {
    map!.delete(key);
    throw error;
  });

  map.set(key, promise);
  return promise;
}

export function cacheKey(base: string, options?: Record<string, unknown>): string {
  if (!options || Object.keys(options).length === 0) {
    return base;
  }

  const normalized = Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("&");

  return `${base}?${normalized}`;
}
