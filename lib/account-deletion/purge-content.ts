import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MEDIA_ORIGINALS_BUCKET,
  MEDIA_RENDERS_BUCKET,
} from "@/lib/media";
import {
  pathFromPublicStorageUrl,
  purgeUserStorage,
  removeStoragePaths,
} from "@/lib/account-deletion/storage-purge";

export type PurgeStepLog = Record<string, unknown>;

function collectPostMediaPaths(post: Record<string, unknown>): string[] {
  const paths: string[] = [];
  const pairs: Array<[string | null | undefined, string]> = [
    [post.image_original_path as string, MEDIA_ORIGINALS_BUCKET],
    [post.video_original_path as string, MEDIA_ORIGINALS_BUCKET],
    [post.image_display_url as string, MEDIA_RENDERS_BUCKET],
    [post.image_thumbnail_url as string, MEDIA_RENDERS_BUCKET],
    [post.video_playback_url as string, MEDIA_RENDERS_BUCKET],
    [post.video_hls_url as string, MEDIA_RENDERS_BUCKET],
    [post.video_thumbnail_url as string, MEDIA_RENDERS_BUCKET],
  ];

  for (const [raw, bucket] of pairs) {
    if (!raw) continue;
    if (!raw.startsWith("http")) {
      paths.push(raw);
      continue;
    }
    const parsed = pathFromPublicStorageUrl(raw, bucket);
    if (parsed) paths.push(parsed);
  }

  return paths;
}

export async function purgeUserGeneratedContent(
  adminClient: SupabaseClient,
  userId: string,
): Promise<PurgeStepLog> {
  const log: PurgeStepLog = { userId };

  // Posts + media (comments/likes cascade on post delete)
  const { data: posts } = await adminClient
    .from("Posts")
    .select(
      "id, image_original_path, video_original_path, image_display_url, image_thumbnail_url, video_playback_url, video_hls_url, video_thumbnail_url",
    )
    .eq("user_id", userId);

  const postMediaPaths: string[] = [];
  for (const post of posts ?? []) {
    postMediaPaths.push(...collectPostMediaPaths(post as Record<string, unknown>));
  }

  const postStorageErrors = [
    ...(await removeStoragePaths(adminClient, MEDIA_ORIGINALS_BUCKET, postMediaPaths)),
    ...(await removeStoragePaths(adminClient, MEDIA_RENDERS_BUCKET, postMediaPaths)),
  ];

  const { error: postsDeleteError, count: postsDeleted } = await adminClient
    .from("Posts")
    .delete({ count: "exact" })
    .eq("user_id", userId);

  log.posts = {
    deleted: postsDeleted ?? (posts ?? []).length,
    error: postsDeleteError?.message ?? null,
    storageErrors: postStorageErrors,
  };

  // Orphan comments/likes on others' posts
  await adminClient.from("post_comments").delete().eq("user_id", userId);
  await adminClient.from("post_likes").delete().eq("user_id", userId);

  // Garage
  const { data: bikes } = await adminClient
    .from("motorcycles")
    .select("id, photo_path")
    .eq("user_id", userId);

  const garagePaths = (bikes ?? [])
    .map((b) => b.photo_path as string | null)
    .filter((p): p is string => Boolean(p));

  if (garagePaths.length > 0) {
    await removeStoragePaths(adminClient, "garage-bike-photos", garagePaths);
  }

  const { error: garageError } = await adminClient.from("motorcycles").delete().eq("user_id", userId);
  log.garage = { deleted: (bikes ?? []).length, error: garageError?.message ?? null };

  // Hosted meets: cancel and strip covers
  const { data: hostedRides } = await adminClient
    .from("rides")
    .select("id, cover")
    .eq("host_id", userId);

  const coverPaths = (hostedRides ?? [])
    .map((r) => pathFromPublicStorageUrl(r.cover as string, "ride-covers"))
    .filter((p): p is string => Boolean(p));

  if (coverPaths.length > 0) {
    await removeStoragePaths(adminClient, "ride-covers", coverPaths);
  }

  if ((hostedRides ?? []).length > 0) {
    await adminClient
      .from("rides")
      .update({ status: "canceled", cover: null })
      .eq("host_id", userId);
  }

  log.hostedRides = { canceled: (hostedRides ?? []).length };

  // Meet participation + chat
  await adminClient.from("ride_attendees").delete().eq("user_id", userId);
  await adminClient.from("ride_messages").delete().eq("user_id", userId);
  await adminClient.from("ride_live_locations").delete().eq("user_id", userId);

  // DM media paths before message delete
  const { data: dmMessages } = await adminClient
    .from("messages")
    .select("id, media_path")
    .eq("sender_id", userId);

  const dmPaths = (dmMessages ?? [])
    .map((m) => m.media_path as string | null)
    .filter((p): p is string => Boolean(p));

  if (dmPaths.length > 0) {
    await removeStoragePaths(adminClient, "message-media", dmPaths);
  }

  await adminClient.from("messages").delete().eq("sender_id", userId);
  await adminClient.from("conversation_members").delete().eq("user_id", userId);

  log.directMessages = {
    messagesDeleted: (dmMessages ?? []).length,
  };

  // Social graph + tokens + notifications
  await adminClient.from("user_follows").delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);
  await adminClient
    .from("user_connections")
    .delete()
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  await adminClient
    .from("user_blocks")
    .delete()
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  await adminClient.from("notifications").delete().eq("user_id", userId);
  await adminClient.from("user_push_tokens").delete().eq("user_id", userId);

  // Bucket sweep by user prefix
  const storage = await purgeUserStorage(adminClient, userId);
  log.storage = storage;

  return log;
}
