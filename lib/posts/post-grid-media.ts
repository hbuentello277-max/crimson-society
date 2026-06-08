import { getBestImageUrl } from "@/lib/media";

export type PostGridMediaFields = {
  post_type?: string | null;
  image_url?: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
  video_thumbnail_url?: string | null;
  media_status?: string | null;
};

export function isReelPost(post: Pick<PostGridMediaFields, "post_type">) {
  return post.post_type === "reel";
}

export function isReelProcessing(post: PostGridMediaFields) {
  if (!isReelPost(post)) return false;
  const status = post.media_status || "ready";
  return status === "queued" || status === "processing";
}

/** Best-effort grid thumbnail for photos and reels. */
export function getPostGridPreviewUrl(post: PostGridMediaFields) {
  if (isReelPost(post) && post.video_thumbnail_url) {
    return getBestImageUrl(post.video_thumbnail_url, null, "profileGrid");
  }

  return getBestImageUrl(
    post.image_thumbnail_url || post.image_display_url,
    post.image_url,
    "profileGrid",
  );
}
