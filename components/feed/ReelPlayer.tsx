"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ReelPlayerProps = {
  postId: string;
  src: string | null;
  poster: string | null;
  mediaStatus: string;
  isActive: boolean;
  onBecameVisible: (postId: string) => void;
  authorName: string;
  priority?: boolean;
};

export function ReelPlayer({
  postId,
  src,
  poster,
  mediaStatus,
  isActive,
  onBecameVisible,
  authorName,
  priority = false,
}: ReelPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  const isProcessing =
    mediaStatus === "queued" || mediaStatus === "processing";
  const isFailed = mediaStatus === "failed";

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible =
          entry.isIntersecting && entry.intersectionRatio >= 0.35;
        setInView(visible);
        if (visible) {
          setShouldLoad(true);
          onBecameVisible(postId);
        }
      },
      { threshold: [0, 0.35, 0.6, 1], rootMargin: "120px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [onBecameVisible, postId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !shouldLoad) return;

    if (isActive && inView) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [inView, isActive, shouldLoad, src]);

  if (isProcessing) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center px-6 text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
          Reel processing for cinematic playback
        </p>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center px-6 text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#e87a82]">
          Reel processing failed
        </p>
      </div>
    );
  }

  if (!src) {
    return poster ? (
      <div ref={containerRef} className="relative h-full w-full">
        <Image
          src={poster}
          alt={`${authorName} reel cover`}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          priority={priority}
          quality={86}
          className="object-cover"
        />
      </div>
    ) : (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center px-6 text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
          Reel unavailable
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full bg-black">
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          className="h-full w-full object-cover"
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
        />
      ) : poster ? (
        <Image
          src={poster}
          alt={`${authorName} reel cover`}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          priority={priority}
          quality={86}
          className="object-cover"
        />
      ) : (
        <div className="h-full w-full bg-black" />
      )}
    </div>
  );
}
