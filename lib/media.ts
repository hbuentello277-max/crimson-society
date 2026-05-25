import type { SupabaseClient } from "@supabase/supabase-js";

export type MediaKind = "image" | "video";

export type ImageVariant = "feed" | "profileGrid" | "thumbnail";

export const MEDIA_PIPELINE_VERSION = 2;
export const MEDIA_ORIGINALS_BUCKET = "media-originals";
export const MEDIA_RENDERS_BUCKET = "media-renders";

const IMAGE_LIMIT_BYTES = 24 * 1024 * 1024;
const VIDEO_LIMIT_BYTES = 768 * 1024 * 1024;

const IMAGE_VARIANTS: Record<ImageVariant, { width: number; quality: number }> = {
  feed: { width: 1536, quality: 86 },
  profileGrid: { width: 720, quality: 84 },
  thumbnail: { width: 420, quality: 82 },
};

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

export type UploadedOriginalMedia = {
  bucket: typeof MEDIA_ORIGINALS_BUCKET;
  path: string;
  contentType: string;
  size: number;
  kind: MediaKind;
};

export type PublicDisplayMedia = {
  bucket: typeof MEDIA_RENDERS_BUCKET;
  path: string;
  publicUrl: string;
};

export function getFileExt(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "bin" : "bin";
}

function cleanFileBase(file: File) {
  return file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function assertMediaUpload(kind: MediaKind, file: File) {
  const ext = getFileExt(file);

  if (kind === "image") {
    if (!file.type.startsWith("image/") && !IMAGE_EXTENSIONS.has(ext)) {
      throw new Error("Choose a JPG, PNG, WebP, HEIC, or HEIF image.");
    }

    if (file.size > IMAGE_LIMIT_BYTES) {
      throw new Error("Images can be up to 24MB so originals stay crisp.");
    }
  }

  if (kind === "video") {
    if (!file.type.startsWith("video/") && !VIDEO_EXTENSIONS.has(ext)) {
      throw new Error("Choose an MP4, MOV, M4V, or WebM video.");
    }

    if (file.size > VIDEO_LIMIT_BYTES) {
      throw new Error("Videos can be up to 768MB. Longer rides should be trimmed before upload.");
    }
  }
}

export function buildOriginalMediaPath(userId: string, kind: MediaKind, file: File) {
  const ext = getFileExt(file);
  const safeBase = cleanFileBase(file) || kind;
  const uploadId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${userId}/${kind}s/${uploadId}/${safeBase}.${ext}`;
}

export async function uploadOriginalMedia(
  supabase: SupabaseClient,
  userId: string,
  kind: MediaKind,
  file: File,
): Promise<UploadedOriginalMedia> {
  assertMediaUpload(kind, file);

  const path = buildOriginalMediaPath(userId, kind, file);
  const contentType =
    file.type || (kind === "image" ? "image/jpeg" : "video/mp4");

  const { error } = await supabase.storage
    .from(MEDIA_ORIGINALS_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    bucket: MEDIA_ORIGINALS_BUCKET,
    path,
    contentType,
    size: file.size,
    kind,
  };
}

export async function uploadImageDisplaySource(
  supabase: SupabaseClient,
  originalPath: string,
  file: File,
): Promise<PublicDisplayMedia> {
  assertMediaUpload("image", file);

  const path = originalPath.replace(/^([^/]+)\/images\//, "$1/images/display/");
  const contentType = file.type || "image/jpeg";

  const { error } = await supabase.storage
    .from(MEDIA_RENDERS_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(MEDIA_RENDERS_BUCKET).getPublicUrl(path);

  return {
    bucket: MEDIA_RENDERS_BUCKET,
    path,
    publicUrl,
  };
}

export async function queueMediaProcessingJob(
  supabase: SupabaseClient,
  values: {
    userId: string;
    postId?: string | null;
    mediaKind: MediaKind;
    sourceBucket: string;
    sourcePath: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("media_processing_jobs").insert({
    post_id: values.postId ?? null,
    user_id: values.userId,
    media_kind: values.mediaKind,
    source_bucket: values.sourceBucket,
    source_path: values.sourcePath,
    metadata: values.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}

export function getImageRenderUrl(
  sourceUrl: string | null | undefined,
  variant: ImageVariant = "feed",
) {
  if (!sourceUrl) return null;

  try {
    const url = new URL(sourceUrl);
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/,
    );

    if (!match) return sourceUrl;

    const [, bucket, objectPath] = match;
    const settings = IMAGE_VARIANTS[variant];
    url.pathname = `/storage/v1/render/image/public/${bucket}/${objectPath}`;
    url.search = new URLSearchParams({
      width: String(settings.width),
      quality: String(settings.quality),
      resize: "contain",
      format: "webp",
    }).toString();

    return url.toString();
  } catch {
    return sourceUrl;
  }
}

export function getBestImageUrl(
  displayUrl?: string | null,
  legacyOriginalUrl?: string | null,
  variant: ImageVariant = "feed",
) {
  void variant;
  return displayUrl || legacyOriginalUrl || null;
}

export function getVideoPlaybackUrl(
  playbackUrl?: string | null,
  hlsUrl?: string | null,
) {
  return hlsUrl || playbackUrl || null;
}
