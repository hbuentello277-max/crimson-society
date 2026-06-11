import { getBestImageUrl } from "@/lib/media";

export const MAX_POST_PHOTOS = 10;

export type PostImageMetadataEntry = {
  display_url?: string | null;
  thumbnail_url?: string | null;
  original_path?: string | null;
  original_bucket?: string | null;
  display_source_path?: string | null;
};

export type PostImagesMetadata = {
  images?: PostImageMetadataEntry[];
  image_count?: number;
};

export function parsePostImagesMetadata(metadata: unknown): PostImagesMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as PostImagesMetadata;
  if (!Array.isArray(record.images) || record.images.length === 0) return null;
  return record;
}

export function resolvePostImageEntryUrl(
  entry: PostImageMetadataEntry,
  context: "feed" | "profileGrid" = "feed",
) {
  return getBestImageUrl(
    entry.thumbnail_url || entry.display_url,
    entry.display_url,
    context,
  );
}

export function getPostImageUrls(
  post: {
    image_url?: string | null;
    image_display_url?: string | null;
    image_thumbnail_url?: string | null;
    media_metadata?: unknown;
  },
  context: "feed" | "profileGrid" = "feed",
) {
  const parsed = parsePostImagesMetadata(post.media_metadata);
  if (parsed?.images?.length) {
    const urls = parsed.images
      .map((entry) => resolvePostImageEntryUrl(entry, context))
      .filter((url): url is string => Boolean(url));
    if (urls.length > 0) return urls;
  }

  const cover = getBestImageUrl(
    post.image_thumbnail_url || post.image_display_url,
    post.image_url,
    context,
  );
  return cover ? [cover] : [];
}

export function getPostImageCount(post: {
  image_url?: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
  media_metadata?: unknown;
}) {
  const parsed = parsePostImagesMetadata(post.media_metadata);
  if (parsed?.images?.length) return parsed.images.length;
  if (typeof parsed?.image_count === "number" && parsed.image_count > 0) {
    return parsed.image_count;
  }

  const cover = getBestImageUrl(
    post.image_thumbnail_url || post.image_display_url,
    post.image_url,
    "profileGrid",
  );
  return cover ? 1 : 0;
}
