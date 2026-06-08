import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MEDIA_ORIGINALS_BUCKET,
  MEDIA_RENDERS_BUCKET,
} from "@/lib/media";
import { removeStoragePaths } from "@/lib/account-deletion/storage-purge";
import { collectPostMediaPaths, type PostMediaRecord } from "@/lib/posts/post-media-paths";

export async function deletePostStorageAssets(
  adminClient: SupabaseClient,
  post: PostMediaRecord,
): Promise<string[]> {
  const paths = collectPostMediaPaths(post);
  const errors = [
    ...(await removeStoragePaths(adminClient, MEDIA_ORIGINALS_BUCKET, paths.originals)),
    ...(await removeStoragePaths(adminClient, MEDIA_RENDERS_BUCKET, paths.renders)),
  ];
  return errors;
}

export async function deletePostProcessingJobs(
  adminClient: SupabaseClient,
  postId: string,
): Promise<void> {
  await adminClient.from("media_processing_jobs").delete().eq("post_id", postId);
}

export async function purgePostMediaAndJobs(
  adminClient: SupabaseClient,
  post: PostMediaRecord & { id: string },
): Promise<{ storageErrors: string[] }> {
  const storageErrors = await deletePostStorageAssets(adminClient, post);
  await deletePostProcessingJobs(adminClient, post.id);
  return { storageErrors };
}
