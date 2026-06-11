"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { MutableRefObject } from "react";
import { CrimsonSoundAttribution } from "@/components/CrimsonSoundPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardFeedSkeleton } from "@/components/ui/skeletons";
import { CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";
import { dashboardStatusBgMap } from "@/lib/dashboard/constants";
import { getDashboardProfileHref } from "@/lib/dashboard/profile";
import type { DashboardFeedPost } from "@/lib/dashboard/types";
import type { PostActionTarget } from "@/components/social/PostActionSheet";

const ReelPlayer = dynamic(
  () => import("@/components/feed/ReelPlayer").then((module) => module.ReelPlayer),
  { ssr: false },
);

type DashboardFeedSectionProps = {
  feedLoading: boolean;
  posts: DashboardFeedPost[];
  liked: Record<string, boolean>;
  likeCounts: Record<string, number>;
  bookmarked: Record<string, boolean>;
  popId: string | null;
  highlightedPostId: string | null;
  activeReelId: string | null;
  currentUserId?: string;
  isAdmin: boolean;
  carouselRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  postRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onToggleLike: (id: string) => void;
  onOpenComments: (postId: string) => void;
  onOpenShare: (postId: string) => void;
  onToggleBookmark: (id: string) => void;
  onOpenPostActions: (target: PostActionTarget) => void;
  onActiveReelChange: (postId: string) => void;
};

export function DashboardFeedSection({
  feedLoading,
  posts,
  liked,
  likeCounts,
  bookmarked,
  popId,
  highlightedPostId,
  activeReelId,
  currentUserId,
  isAdmin,
  carouselRefs,
  postRefs,
  onToggleLike,
  onOpenComments,
  onOpenShare,
  onToggleBookmark,
  onOpenPostActions,
  onActiveReelChange,
}: DashboardFeedSectionProps) {
  return (
    <>
      <div className="mt-7 mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Latest Posts</p>
          <h2 className="mt-1 font-serif text-2xl italic text-white">From the society</h2>
        </div>
      </div>

      <div className="space-y-6">
        {feedLoading && <DashboardFeedSkeleton />}

        {!feedLoading && posts.length === 0 && (
          <EmptyState
            title="The feed is quiet."
            body="When riders post photos, reels, and status updates, they will appear here. Be the first to share from the road."
          />
        )}

        {!feedLoading &&
          posts.map((post, postIndex) => {
            const count = likeCounts[post.id] ?? post.likes;
            const isLiked = !!liked[post.id];
            const isBookmarked = !!bookmarked[post.id];
            const photos = post.photos ?? [];
            const canDeletePost = Boolean(
              post.userId && currentUserId && (post.userId === currentUserId || isAdmin),
            );
            const profileHref = getDashboardProfileHref(post.author.handle);

            const avatar = (
              <div className={`relative h-10 w-10 ${CS_AVATAR_RING}`}>
                {post.author.photo ? (
                  <Image
                    src={post.author.photo}
                    alt={post.author.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className={`${CS_AVATAR_FALLBACK} text-sm`}>
                    {(post.author.name || "C").charAt(0)}
                  </div>
                )}
              </div>
            );

            const authorDetails = (
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-white">{post.author.name}</p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  {post.author.handle}
                  {post.location && ` · ${post.location}`}
                </p>
              </div>
            );

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                ref={(el) => {
                  postRefs.current[post.id] = el;
                }}
                className={`overflow-hidden rounded-2xl border bg-gradient-to-b from-[#0c0c0d] to-[#070707] ${
                  highlightedPostId === post.id
                    ? "border-[#b4141e]/70 ring-2 ring-[#b4141e]/35"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  {profileHref ? (
                    <>
                      <Link href={profileHref} className="shrink-0">
                        {avatar}
                      </Link>
                      <Link href={profileHref} className="min-w-0 flex-1">
                        {authorDetails}
                      </Link>
                    </>
                  ) : (
                    <>
                      {avatar}
                      {authorDetails}
                    </>
                  )}

                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                    {post.timeLabel}
                  </span>

                  {currentUserId ? (
                    <button
                      type="button"
                      onTouchStart={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={() =>
                        onOpenPostActions({
                          postId: post.id,
                          authorId: post.userId || "",
                          authorUsername: post.author.handle.replace(/^@+/, ""),
                          authorName: post.author.name,
                          isOwner: canDeletePost,
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-lg leading-none text-white/60 hover:border-white/25 hover:text-white"
                      aria-label="Post options"
                    >
                      ⋯
                    </button>
                  ) : null}
                </div>

                {post.type === "garage_build" && (
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">
                      Garage Build · {post.garageRideLabel}
                    </p>
                    {post.garageModificationTitle ? (
                      <p className="mt-1 font-serif text-xl text-white">
                        {post.garageModificationTitle}
                      </p>
                    ) : null}
                  </div>
                )}

                {(post.type === "photo" || post.type === "garage_build") && photos.length > 0 && (
                  <div
                    ref={(el) => {
                      carouselRefs.current[post.id] = el;
                    }}
                    className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
                  >
                    {photos.map((src, idx) => (
                      <div
                        key={`${post.id}-${idx}`}
                        className="relative aspect-square w-full flex-shrink-0 snap-center bg-black"
                      >
                        <Image
                          src={src}
                          alt={`${post.author.name} post image ${idx + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 768px"
                          priority={postIndex === 0 && idx === 0}
                          quality={88}
                          className="object-cover"
                        />
                        {photos.length > 1 && (
                          <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur">
                            {idx + 1} / {photos.length}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {post.type === "garage_build" && post.video && (
                  <div className="relative aspect-[9/16] max-h-[560px] bg-black">
                    <ReelPlayer
                      postId={post.id}
                      src={post.video || null}
                      poster={post.videoThumbnail || photos[0] || null}
                      mediaStatus={post.mediaStatus || "ready"}
                      isActive={activeReelId === post.id}
                      onBecameVisible={onActiveReelChange}
                      authorName={post.author.name}
                      priority={postIndex === 0}
                    />
                  </div>
                )}

                {post.type === "reel" && (
                  <div className="relative aspect-[9/16] max-h-[560px] bg-black">
                    <ReelPlayer
                      postId={post.id}
                      src={post.video || null}
                      poster={post.videoThumbnail || photos[0] || null}
                      mediaStatus={post.mediaStatus || "ready"}
                      isActive={activeReelId === post.id}
                      onBecameVisible={onActiveReelChange}
                      authorName={post.author.name}
                      priority={postIndex === 0}
                    />

                    {post.sound && (
                      <div className="absolute bottom-3 left-3 right-3 flex">
                        <CrimsonSoundAttribution sound={post.sound} compact />
                      </div>
                    )}
                  </div>
                )}

                {post.type === "status" && post.statusText && (
                  <div
                    className={`flex min-h-[260px] items-center justify-center p-8 ${
                      dashboardStatusBgMap[post.statusBg || "noir"] || dashboardStatusBgMap.noir
                    }`}
                  >
                    <p className="text-center font-serif text-2xl italic text-white">
                      {post.statusText}
                    </p>
                  </div>
                )}

                <div
                  className="flex items-center gap-4 px-4 pt-3"
                  onTouchStart={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                    <button
                      type="button"
                      onClick={() => onToggleLike(post.id)}
                      className="flex items-center gap-1.5"
                      aria-label="Like"
                    >
                    <span
                      className={`text-2xl transition-transform ${
                        isLiked ? "text-[#b4141e]" : "text-white/70"
                      } ${popId === post.id ? "scale-125" : ""}`}
                    >
                      {isLiked ? "♥" : "♡"}
                    </span>
                    <span className="text-xs text-white/70">{count}</span>
                  </button>

                    <button
                      type="button"
                      onClick={() => onOpenComments(post.id)}
                      className="flex items-center gap-1.5 text-white/70 hover:text-white"
                      aria-label="Comment"
                    >
                    <span className="text-xl">💬</span>
                    <span className="text-xs">{post.comments}</span>
                  </button>

                    <button
                      type="button"
                      onClick={() => onOpenShare(post.id)}
                      className="text-xl text-white/70 hover:text-white"
                      aria-label="Share"
                    >
                    ↗
                  </button>

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(post.id)}
                      className={`ml-auto text-2xl transition ${
                      isBookmarked ? "text-[#e87a82]" : "text-white/70"
                    }`}
                    aria-label="Bookmark"
                  >
                    {isBookmarked ? "▰" : "▱"}
                  </button>
                </div>

                {post.type !== "status" && post.caption && (
                  <p className="px-4 pb-2 pt-2 text-sm text-white/85">
                    <span className="text-white">
                      {profileHref ? (
                        <Link href={profileHref} className="transition hover:text-[#e87a82]">
                          {post.author.handle}
                        </Link>
                      ) : (
                        post.author.handle
                      )}
                    </span>{" "}
                    {post.caption}
                  </p>
                )}

                {post.type === "photo" && post.sound && (
                  <div className="px-4 pb-2 pt-2">
                    <CrimsonSoundAttribution sound={post.sound} compact />
                  </div>
                )}

                {post.taggedRiders && post.taggedRiders.length > 0 && (
                  <p className="px-4 pb-4 text-[11px] text-[#e87a82]">
                    with {post.taggedRiders.join(" · ")}
                  </p>
                )}

                {(post.type === "status" ||
                  (!post.caption && (!post.taggedRiders || post.taggedRiders.length === 0))) && (
                  <div className="pb-4" />
                )}
              </article>
            );
          })}
      </div>

      <div className="mt-10 flex items-center justify-center gap-3 text-white/30">
        <div className="h-px w-12 bg-white/15" />
        <span className="text-xs">✦</span>
        <div className="h-px w-12 bg-white/15" />
      </div>

      <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] text-white/30">
        © Crimson Society · MMXXVI
      </p>
    </>
  );
}
