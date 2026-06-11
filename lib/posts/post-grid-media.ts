import { getBestImageUrl } from "@/lib/media";
import { getReelProcessingLabel, isReelMediaFailed, isReelMediaPending } from "@/lib/media/reel-status";
import { getPostImageCount } from "@/lib/posts/post-images";

export type PostGridMediaFields = {
  post_type?: string | null;
  image_url?: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
  video_thumbnail_url?: string | null;
  media_status?: string | null;
  media_metadata?: unknown;
};

export function isGarageBuildPost(post: Pick<PostGridMediaFields, "post_type">) {
  return post.post_type === "garage_build";
}

export function isReelPost(post: Pick<PostGridMediaFields, "post_type">) {
  return post.post_type === "reel";
}

export function isReelProcessing(post: PostGridMediaFields) {
  if (!isReelPost(post)) return false;
  return isReelMediaPending(post.media_status || "ready");
}

export function isReelFailed(post: PostGridMediaFields) {
  if (!isReelPost(post)) return false;
  return isReelMediaFailed(post.media_status || "ready");
}

export function getReelGridStatusLabel(post: PostGridMediaFields) {
  if (!isReelPost(post)) return null;
  return getReelProcessingLabel(post.media_status || "ready");
}

/** Best-effort grid thumbnail for photos and reels. */
export function getPostGridPreviewUrl(post: PostGridMediaFields) {
  if ((isReelPost(post) || isGarageBuildPost(post)) && post.video_thumbnail_url) {
    return getBestImageUrl(post.video_thumbnail_url, null, "profileGrid");
  }

  return getBestImageUrl(
    post.image_thumbnail_url || post.image_display_url,
    post.image_url,
    "profileGrid",
  );
}

export function getPostGridImageCount(post: PostGridMediaFields) {
  if (isStatusPost(post) || isReelPost(post) || isGarageBuildPost(post)) {
    return 0;
  }
  return getPostImageCount(post);
}

function isStatusPost(post: Pick<PostGridMediaFields, "post_type">) {
  return post.post_type === "status";
}
