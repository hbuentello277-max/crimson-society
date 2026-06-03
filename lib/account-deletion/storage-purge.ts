import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DM_MESSAGE_MEDIA_BUCKET,
} from "@/lib/messages/dm-message";
import {
  MEDIA_ORIGINALS_BUCKET,
  MEDIA_RENDERS_BUCKET,
} from "@/lib/media";

export const USER_STORAGE_BUCKETS = [
  "avatars",
  "garage-bike-photos",
  "ride-covers",
  "ride-chat-media",
  DM_MESSAGE_MEDIA_BUCKET,
  MEDIA_ORIGINALS_BUCKET,
  MEDIA_RENDERS_BUCKET,
] as const;

async function listAllPaths(
  adminClient: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  const queue = [prefix.replace(/\/$/, "")];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { data, error } = await adminClient.storage.from(bucket).list(current, {
      limit: 1000,
    });

    if (error || !data) continue;

    for (const entry of data) {
      const fullPath = current ? `${current}/${entry.name}` : entry.name;
      if (entry.id === null) {
        queue.push(fullPath);
      } else {
        paths.push(fullPath);
      }
    }
  }

  return paths;
}

export async function removeStoragePrefix(
  adminClient: SupabaseClient,
  bucket: string,
  userId: string,
): Promise<{ removed: number; errors: string[] }> {
  const errors: string[] = [];
  const paths = await listAllPaths(adminClient, bucket, userId);

  if (paths.length === 0) {
    return { removed: 0, errors };
  }

  const chunkSize = 100;
  let removed = 0;

  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await adminClient.storage.from(bucket).remove(chunk);
    if (error) {
      errors.push(`${bucket}: ${error.message}`);
    } else {
      removed += chunk.length;
    }
  }

  return { removed, errors };
}

export async function purgeUserStorage(
  adminClient: SupabaseClient,
  userId: string,
): Promise<{ removed: number; errors: string[] }> {
  let removed = 0;
  const errors: string[] = [];

  for (const bucket of USER_STORAGE_BUCKETS) {
    const result = await removeStoragePrefix(adminClient, bucket, userId);
    removed += result.removed;
    errors.push(...result.errors);
  }

  return { removed, errors };
}

export async function removeStoragePaths(
  adminClient: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<string[]> {
  const errors: string[] = [];
  const unique = [...new Set(paths.filter(Boolean))];

  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const { error } = await adminClient.storage.from(bucket).remove(chunk);
    if (error) errors.push(`${bucket}: ${error.message}`);
  }

  return errors;
}

/** Extract storage path from a public Supabase storage URL when possible. */
export function pathFromPublicStorageUrl(
  url: string | null | undefined,
  bucket: string,
): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] ?? "");
}
