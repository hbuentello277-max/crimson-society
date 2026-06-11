"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ReelPlayer } from "@/components/feed/ReelPlayer";
import {
  formatGarageBuildDate,
  formatGarageBuildRideLabel,
  GARAGE_BUILD_POST_TYPE,
  parseGarageBuildMetadata,
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

export function ProfileGarageBuildsSection({ userId, isOwnProfile = false }: Props) {
  const [posts, setPosts] = useState<GarageBuildPost[]>([]);
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

    setPosts((data as GarageBuildPost[]) ?? []);
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
        const imageUrl = getBestImageUrl(
          post.image_thumbnail_url || post.image_display_url,
          post.image_url,
          "profileGrid",
        );
        const videoUrl = getVideoPlaybackUrl(post.video_playback_url || post.video_url, post.video_hls_url);
        const videoPoster = getBestImageUrl(post.video_thumbnail_url, imageUrl, "profileGrid");

        return (
          <article
            key={post.id}
            className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#0f0f10] to-[#070707]"
          >
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{rideLabel}</p>
              <h3 className="mt-2 font-serif text-2xl leading-tight text-white">{modificationTitle}</h3>
              <p className="mt-2 text-xs text-zinc-500">{formatGarageBuildDate(post.created_at)}</p>
            </div>

            {imageUrl ? (
              <div className="relative aspect-[16/10] bg-black">
                <Image
                  src={imageUrl}
                  alt={modificationTitle}
                  fill
                  sizes="(max-width: 768px) 100vw, 720px"
                  className="object-cover"
                  unoptimized={imageUrl.includes("supabase")}
                />
              </div>
            ) : null}

            {videoUrl ? (
              <div className="relative aspect-[9/16] max-h-[420px] bg-black">
                <ReelPlayer
                  postId={post.id}
                  src={videoUrl}
                  poster={videoPoster}
                  mediaStatus={post.media_status || "ready"}
                  isActive={false}
                  onBecameVisible={() => {}}
                  authorName={rideLabel}
                />
              </div>
            ) : null}

            {post.caption?.trim() ? (
              <div className="px-5 py-4">
                <p className="text-sm leading-6 text-zinc-300">{post.caption.trim()}</p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
