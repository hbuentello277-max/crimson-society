"use client";

import Image from "next/image";
import {
  getPostGridPreviewUrl,
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
  const showReelOverlay = isReelPost(post);
  const processing = isReelProcessing(post);

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
        </>
      ) : processing ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black/70 px-4 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-lg text-white/80">
            ▶
          </span>
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Processing reel
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
