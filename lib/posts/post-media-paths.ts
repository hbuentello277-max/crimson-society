import {
  MEDIA_ORIGINALS_BUCKET,
  MEDIA_RENDERS_BUCKET,
} from "@/lib/media";
import { pathFromPublicStorageUrl } from "@/lib/account-deletion/storage-purge";

export type PostMediaRecord = {
  image_original_path?: string | null;
  video_original_path?: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
  video_playback_url?: string | null;
  video_hls_url?: string | null;
  video_thumbnail_url?: string | null;
};

/** Collect storage object paths for a post across originals and renders buckets. */
export function collectPostMediaPaths(post: PostMediaRecord): {
  originals: string[];
  renders: string[];
} {
  const originals: string[] = [];
  const renders: string[] = [];

  const pairs: Array<[string | null | undefined, "originals" | "renders"]> = [
    [post.image_original_path, "originals"],
    [post.video_original_path, "originals"],
    [post.image_display_url, "renders"],
    [post.image_thumbnail_url, "renders"],
    [post.video_playback_url, "renders"],
    [post.video_hls_url, "renders"],
    [post.video_thumbnail_url, "renders"],
  ];

  for (const [raw, bucket] of pairs) {
    if (!raw) continue;

    if (!raw.startsWith("http")) {
      if (bucket === "originals") originals.push(raw);
      else renders.push(raw);
      continue;
    }

    const targetBucket =
      bucket === "originals" ? MEDIA_ORIGINALS_BUCKET : MEDIA_RENDERS_BUCKET;
    const parsed = pathFromPublicStorageUrl(raw, targetBucket);
    if (parsed) {
      if (bucket === "originals") originals.push(parsed);
      else renders.push(parsed);
    }
  }

  return {
    originals: [...new Set(originals)],
    renders: [...new Set(renders)],
  };
}
