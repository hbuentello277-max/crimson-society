"use client";

import Image from "next/image";
import {
  getPostGridImageCount,
  getPostGridPreviewUrl,
  getReelGridStatusLabel,
  isReelFailed,
  isReelPost,
  isReelProcessing,
  type PostGridMediaFields,
} from "@/lib/posts/post-grid-media";

type PostGridTileProps = {
  post: PostGridMediaFields & {
    caption?: string | null;
    status_text?: string | null;
    status_bg?: string | null;
  };
  statusClass?: string;
  isStatus: boolean;
  statusText: string;
  priority?: boolean;
  alt?: string;
  children?: React.ReactNode;
};

export function PostGridTile({
  post,
  statusClass = "",
  isStatus,
  statusText,
  priority = false,
  alt = "Crimson Society post",
  children,
}: PostGridTileProps) {
  const previewUrl = getPostGridPreviewUrl(post);
  const imageCount = getPostGridImageCount(post);
  const showReelOverlay = isReelPost(post) && !!previewUrl;
  const processing = isReelProcessing(post);
  const failed = isReelFailed(post);
  const statusLabel = getReelGridStatusLabel(post);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.02]">
      {children}

      {isStatus ? (
        <div
          className={`flex h-full w-full items-center justify-center px-4 text-center ${statusClass}`}
        >
          <p className="font-serif text-lg italic leading-snug text-white">
            {statusText || "Status"}
          </p>
        </div>
      ) : previewUrl ? (
        <>
          <Image
            src={previewUrl}
            alt={alt}
            fill
            sizes="(max-width: 768px) 50vw, 320px"
            priority={priority}
            className="object-cover"
          />
          {showReelOverlay && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/55 text-lg text-white backdrop-blur">
                ▶
              </span>
            </div>
          )}
          {imageCount > 1 ? (
            <span className="pointer-events-none absolute right-2 top-2 rounded-full border border-white/15 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white backdrop-blur">
              1/{imageCount}
            </span>
          ) : null}
        </>
      ) : failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black/80 px-3 text-center">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#e87a82]">
            {statusLabel || "Reel processing failed. Try uploading again."}
          </p>
        </div>
      ) : processing ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black/70 px-3 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-sm text-white/80">
            ▶
          </span>
          <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            {statusLabel || "Processing reel…"}
          </p>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs uppercase tracking-[0.2em] text-zinc-400">
          {post.caption || "No preview"}
        </div>
      )}
    </div>
  );
}
