"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ReelPlayer } from "@/components/feed/ReelPlayer";
import {
  formatGarageBuildDate,
  formatGarageBuildRideLabel,
  GARAGE_BUILD_POST_TYPE,
  getGarageBuildPhotoUrls,
  parseGarageBuildMetadata,
  resolveGarageBuildRideImageUrl,
} from "@/lib/garage/garage-build";
import { getBestImageUrl, getVideoPlaybackUrl } from "@/lib/media";
import { supabase } from "@/lib/supabase";

type GarageBuildPost = {
  id: string;
  caption: string | null;
  image_url: string | null;
  image_display_url: string | null;
  image_thumbnail_url: string | null;
  video_url: string | null;
  video_playback_url: string | null;
  video_hls_url: string | null;
  video_thumbnail_url: string | null;
  media_status: string | null;
  media_metadata: Record<string, unknown> | null;
  created_at: string;
};

type LoadState = "idle" | "loading" | "loaded" | "error";

type Props = {
  userId: string | null;
  isOwnProfile?: boolean;
};

function GarageBuildGallery({
  postId,
  modificationTitle,
  imageUrls,
}: {
  postId: string;
  modificationTitle: string;
  imageUrls: string[];
}) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (imageUrls.length <= 1) return;
    const timer = window.setTimeout(() => {
      setVisibleCount(imageUrls.length);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [imageUrls.length]);

  return (
    <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-black">
      {imageUrls.slice(0, visibleCount).map((imageUrl, index) => (
        <div
          key={`${postId}-garage-photo-${index}`}
          className="relative aspect-[16/10] w-full shrink-0 snap-center bg-black"
        >
          <Image
            src={imageUrl}
            alt={`${modificationTitle} photo ${index + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
            unoptimized={imageUrl.includes("supabase")}
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
          />
          {imageUrls.length > 1 ? (
            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur">
              {index + 1} / {imageUrls.length}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function GarageBuildVideo({
  postId,
  videoUrl,
  videoPoster,
  mediaStatus,
  rideLabel,
}: {
  postId: string;
  videoUrl: string;
  videoPoster: string | null;
  mediaStatus: string;
  rideLabel: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isPlaying) {
    return (
      <button
        type="button"
        onClick={() => setIsPlaying(true)}
        className="relative aspect-[9/16] max-h-[420px] w-full bg-black"
        aria-label="Play garage build video"
      >
        {videoPoster ? (
          <Image
            src={videoPoster}
            alt={`${rideLabel} video`}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover"
            unoptimized={videoPoster.includes("supabase")}
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur">
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-6 w-6">
              <path d="M8 5.14v13.72L19 12 8 5.14z" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="relative aspect-[9/16] max-h-[420px] bg-black">
      <ReelPlayer
        postId={postId}
        src={videoUrl}
        poster={videoPoster}
        mediaStatus={mediaStatus}
        isActive
        onBecameVisible={() => {}}
        authorName={rideLabel}
      />
    </div>
  );
}

export function ProfileGarageBuildsSection({ userId, isOwnProfile = false }: Props) {
  const [posts, setPosts] = useState<GarageBuildPost[]>([]);
  const [motorcyclePhotos, setMotorcyclePhotos] = useState<Map<string, string | null>>(new Map());
  const [state, setState] = useState<LoadState>("idle");

  const loadBuilds = useCallback(async () => {
    if (!userId) return;
    setState("loading");

    const { data, error } = await supabase
      .from("Posts")
      .select(
        "id, caption, image_url, image_display_url, image_thumbnail_url, video_url, video_playback_url, video_hls_url, video_thumbnail_url, media_status, media_metadata, created_at",
      )
      .eq("user_id", userId)
      .eq("post_type", GARAGE_BUILD_POST_TYPE)
      .order("created_at", { ascending: false })
      .limit(48);

    if (error) {
      setState("error");
      return;
    }

    const nextPosts = (data as GarageBuildPost[]) ?? [];
    const motorcycleIds = Array.from(
      new Set(
        nextPosts
          .map((post) => parseGarageBuildMetadata(post.media_metadata)?.motorcycle_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    let photoMap = new Map<string, string | null>();
    if (motorcycleIds.length > 0) {
      const { data: motorcycles } = await supabase
        .from("motorcycles")
        .select("id, photo_url")
        .in("id", motorcycleIds);

      photoMap = new Map(
        (motorcycles ?? []).map((bike) => [bike.id as string, (bike.photo_url as string | null) ?? null]),
      );
    }

    setMotorcyclePhotos(photoMap);
    setPosts(nextPosts);
    setState("loaded");
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void loadBuilds();
  }, [loadBuilds, userId]);

  if (state === "loading") {
    return <p className="text-sm text-zinc-500">Loading garage builds…</p>;
  }

  if (state === "error") {
    return <p className="text-sm text-zinc-500">Garage builds could not load.</p>;
  }

  if (state === "loaded" && posts.length === 0) {
    return (
      <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-8 text-center">
        <p className="font-serif text-2xl italic text-zinc-300">No garage builds yet.</p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">
          Share your ride mods and build updates as a Garage Build post.
        </p>
        {isOwnProfile ? (
          <Link
            href="/create"
            className="mt-6 inline-flex rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
          >
            Create Garage Build
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const garageBuild = parseGarageBuildMetadata(post.media_metadata);
        const modificationTitle = garageBuild?.modification_title?.trim() || "Garage Build";
        const rideLabel = formatGarageBuildRideLabel(garageBuild);
        const primaryImageUrl = post.image_thumbnail_url || post.image_display_url || post.image_url;
        const imageUrls = getGarageBuildPhotoUrls(garageBuild, primaryImageUrl).map(
          (url) => getBestImageUrl(url, null, "profileGrid") || url,
        );
        const rawRideImageUrl = resolveGarageBuildRideImageUrl(garageBuild, motorcyclePhotos);
        const rideImageUrl = rawRideImageUrl
          ? getBestImageUrl(rawRideImageUrl, null, "thumbnail")
          : null;
        const videoUrl = getVideoPlaybackUrl(post.video_playback_url || post.video_url, post.video_hls_url);
        const videoPoster = getBestImageUrl(post.video_thumbnail_url, imageUrls[0], "profileGrid");

        return (
          <article
            key={post.id}
            className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#0f0f10] to-[#070707]"
          >
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                  {rideImageUrl ? (
                    <Image
                      src={rideImageUrl}
                      alt={rideLabel}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized={rideImageUrl.includes("supabase")}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#b4141e]/10 text-[10px] uppercase tracking-[0.16em] text-[#e87a82]">
                      Ride
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{rideLabel}</p>
                  <h3 className="mt-1 font-serif text-2xl leading-tight text-white">{modificationTitle}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{formatGarageBuildDate(post.created_at)}</p>
                </div>
              </div>
            </div>

            {imageUrls.length > 0 ? (
              <GarageBuildGallery
                postId={post.id}
                modificationTitle={modificationTitle}
                imageUrls={imageUrls}
              />
            ) : null}

            {videoUrl ? (
              <GarageBuildVideo
                postId={post.id}
                videoUrl={videoUrl}
                videoPoster={videoPoster}
                mediaStatus={post.media_status || "ready"}
                rideLabel={rideLabel}
              />
            ) : null}

            {post.caption?.trim() ? (
              <div className="border-t border-white/10 px-5 py-4">
                <p className="text-sm leading-6 text-zinc-300">{post.caption.trim()}</p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
