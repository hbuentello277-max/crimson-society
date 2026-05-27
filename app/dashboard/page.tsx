"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { getBestImageUrl, getVideoPlaybackUrl } from "@/lib/media";
import { CrimsonSoundAttribution } from "@/components/CrimsonSoundPicker";
import type { CrimsonSound } from "@/lib/sounds";

type PostType = "photo" | "reel" | "status";

type FeedPost = {
  id: string;
  type: PostType;
  author: { name: string; handle: string; photo: string | null };
  location?: string;
  caption?: string;
  photos?: string[];
  video?: string | null;
  sound?: CrimsonSound | null;
  statusText?: string;
  statusBg?: string;
  mediaStatus?: string;
  taggedRiders?: string[];
  timeLabel: string;
  likes: number;
  comments: number;
};

type RawProfile = {
  id?: string;
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
} | null;

type RawPost = {
  id: string;
  user_id: string;
  post_type?: string | null;
  caption?: string | null;
  image_url?: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
  video_url?: string | null;
  video_playback_url?: string | null;
  video_hls_url?: string | null;
  video_thumbnail_url?: string | null;
  media_status?: string | null;
  status_text?: string | null;
  status_bg?: string | null;
  location?: string | null;
  created_at: string;
  profiles?: RawProfile | RawProfile[];
  post_likes?: { count: number }[];
  post_comments?: { count: number }[];
  post_sounds?: {
    id: string;
    sounds: CrimsonSound | CrimsonSound[] | null;
  }[];
};

const statusBgMap: Record<string, string> = {
  noir: "bg-gradient-to-br from-[#050505] via-[#0c0c0d] to-[#050505]",
  crimson: "bg-gradient-to-br from-[#3a0709] via-[#b4141e] to-[#3a0709]",
  carbon: "bg-gradient-to-br from-[#1a1a1c] via-[#2a2a2e] to-[#0a0a0c]",
  ember: "bg-gradient-to-br from-[#1a0405] via-[#6a0d14] to-[#0a0102]",
};

const seedPosts: FeedPost[] = [
  {
    id: "seed-1",
    type: "photo",
    author: {
      name: "Marco Vélez",
      handle: "@nightrider",
      photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200",
    },
    location: "Hill Country · TX",
    caption: "Dawn patrol through the canyons. The bike sounded like a prayer.",
    photos: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200"],
    timeLabel: "2h",
    likes: 248,
    comments: 31,
  },
  {
    id: "seed-2",
    type: "reel",
    author: {
      name: "Elena Ruiz",
      handle: "@ironsaint",
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    },
    location: "Mulholland · LA",
    caption: "Sunset run. No words.",
    video: null,
    photos: ["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200"],
    timeLabel: "5h",
    likes: 612,
    comments: 84,
  },
  {
    id: "seed-3",
    type: "status",
    author: {
      name: "Devin Cole",
      handle: "@blackmass",
      photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200",
    },
    statusText: "Two wheels, one road, no apologies.",
    statusBg: "crimson",
    timeLabel: "9h",
    likes: 184,
    comments: 22,
  },
  {
    id: "seed-4",
    type: "photo",
    author: {
      name: "Aiyana Cross",
      handle: "@savagegrace",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    },
    location: "Red Rocks · CO",
    caption: "Cold morning, warm exhaust.",
    photos: ["https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=1200"],
    timeLabel: "1d",
    likes: 421,
    comments: 47,
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function pickProfile(profileInput: RawProfile | RawProfile[] | undefined) {
  if (Array.isArray(profileInput)) return profileInput[0] ?? null;
  return profileInput ?? null;
}

function pickSound(postSounds: RawPost["post_sounds"]) {
  const sound = postSounds?.[0]?.sounds;
  if (Array.isArray(sound)) return sound[0] ?? null;
  return sound ?? null;
}

function mapPostToFeed(post: RawPost): FeedPost {
  const profile = pickProfile(post.profiles);
  const sound = pickSound(post.post_sounds);
  const imageUrl = getBestImageUrl(
    post.image_display_url || post.video_thumbnail_url,
    post.image_url,
    "feed",
  );

  const name = profile?.display_name || profile?.full_name || "Unknown Rider";
  const handle = profile?.username ? `@${profile.username}` : "@unknown";
  const photo = profile?.profile_image_url || profile?.avatar_url || null;

  return {
    id: post.id,
    type: (post.post_type || "photo") as PostType,
    author: {
      name,
      handle,
      photo,
    },
    location: post.location || "",
    caption: post.caption || "",
    photos: imageUrl ? [imageUrl] : [],
    video: getVideoPlaybackUrl(
      post.video_playback_url || post.video_url,
      post.video_hls_url,
    ),
    sound,
    statusText: post.status_text || "",
    statusBg: post.status_bg || "noir",
    mediaStatus: post.media_status || "ready",
    taggedRiders: [],
    timeLabel: timeAgo(post.created_at),
    likes: post.post_likes?.[0]?.count || 0,
    comments: post.post_comments?.[0]?.count || 0,
  };
}

const PULL_THRESHOLD = 70;
const MAX_PULL = 120;

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>(seedPosts);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [popId, setPopId] = useState<string | null>(null);
  const [commentSheet, setCommentSheet] = useState<string | null>(null);
  const [shareSheet, setShareSheet] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [pullY, setPullY] = useState(0);

  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const mouseStartY = useRef<number | null>(null);
  const isMouseDown = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  const loadFeed = useCallback(async () => {
    if (!session) return;

    setFeedLoading(true);
    const { data, error } = await supabase
      .from('"Posts"')
      .select(`
        id,
        user_id,
        post_type,
        caption,
        image_url,
        image_display_url,
        image_thumbnail_url,
        video_url,
        video_playback_url,
        video_hls_url,
        video_thumbnail_url,
        media_status,
        status_text,
        status_bg,
        location,
        created_at,
        profiles (
          id,
          username,
          display_name,
          full_name,
          avatar_url,
          profile_image_url
        ),
        post_likes(count),
        post_comments(count),
        post_sounds (
          id,
          sounds (
            id,
            title,
            artist,
            duration_seconds,
            mood,
            bpm,
            cover_image_url,
            audio_url,
            preview_url,
            license_type,
            rights_owner,
            source_url,
            approved,
            featured,
            usage_count,
            category_id,
            created_at
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Feed load error object:", error);
      console.log("message:", error.message);
      console.log("details:", error.details);
      console.log("hint:", error.hint);
      console.log("code:", error.code);
      setToast("Could not load posts.");
      setTimeout(() => setToast(null), 1800);
      setFeedLoading(false);
      return;
    }

    const livePosts = ((data || []) as RawPost[]).map(mapPostToFeed);
    setPosts(livePosts.length > 0 ? [...livePosts, ...seedPosts] : seedPosts);
    setFeedLoading(false);
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const timer = window.setTimeout(() => {
      void loadFeed();
    }, 0);

    const onFocus = () => {
      void loadFeed();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadFeed, session]);

  const doRefresh = () => {
    if (refreshing) return;

    setRefreshing(true);

    setTimeout(() => {
      void loadFeed();
      setRefreshing(false);
      setPullY(0);
      setToast("Feed refreshed.");
      setTimeout(() => setToast(null), 1600);
    }, 700);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 4 || refreshing) return;
    pullStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || pullStartY.current === null || refreshing) return;

    const delta = e.touches[0].clientY - pullStartY.current;

    if (delta > 0 && window.scrollY <= 4) {
      const damped = Math.min(MAX_PULL, delta * 0.5);
      setPullY(damped);
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling.current) return;

    isPulling.current = false;
    pullStartY.current = null;

    if (pullY >= PULL_THRESHOLD) {
      doRefresh();
    } else {
      setPullY(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.scrollY > 4 || refreshing) return;
    mouseStartY.current = e.clientY;
    isMouseDown.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || mouseStartY.current === null || refreshing) return;

    const delta = e.clientY - mouseStartY.current;

    if (delta > 0 && window.scrollY <= 4) {
      const damped = Math.min(MAX_PULL, delta * 0.5);
      setPullY(damped);
    } else {
      setPullY(0);
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDown.current) return;

    isMouseDown.current = false;
    mouseStartY.current = null;

    if (pullY >= PULL_THRESHOLD) {
      doRefresh();
    } else {
      setPullY(0);
    }
  };

  const toggleLike = (id: string) => {
    const wasLiked = liked[id];

    setLiked((prev) => ({ ...prev, [id]: !wasLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [id]:
        (prev[id] ?? posts.find((p) => p.id === id)?.likes ?? 0) +
        (wasLiked ? -1 : 1),
    }));

    if (!wasLiked) {
      setPopId(id);
      setTimeout(() => setPopId(null), 400);
    }
  };

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
    setToast(bookmarked[id] ? "Removed from saved." : "Saved to your dossier.");
    setTimeout(() => setToast(null), 1400);
  };

  const sendComment = () => {
    if (!commentDraft.trim()) return;
    setCommentDraft("");
    setCommentSheet(null);
    setToast("Comment posted.");
    setTimeout(() => setToast(null), 1400);
  };

  const handleShare = (action: string) => {
    setShareSheet(null);
    setToast(action);
    setTimeout(() => setToast(null), 1400);
  };

  const visibleOffset = refreshing ? PULL_THRESHOLD : pullY;
  const pullProgress = Math.min(1, pullY / PULL_THRESHOLD);
  const willRefresh = pullY >= PULL_THRESHOLD;

  if (loading && !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">
          Opening...
        </p>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main
      className="min-h-screen bg-[#050505] pb-32 text-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-end justify-between px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">
              The Feed
            </p>
            <h1 className="font-serif text-2xl italic text-white">
              Crimson Society
            </h1>
          </div>
          <Link
            href="/create"
            className="rounded-full bg-[#b4141e] px-4 py-2 text-xs uppercase tracking-[0.25em] text-white shadow-[0_0_20px_rgba(180,20,30,0.35)] hover:bg-[#d11827]"
          >
            + Post
          </Link>
        </div>
      </header>

      <div
        className="pointer-events-none absolute left-0 right-0 z-30 flex items-center justify-center"
        style={{
          height: `${visibleOffset}px`,
          opacity: visibleOffset > 6 ? 1 : 0,
          transition:
            refreshing || pullY === 0
              ? "height 0.3s ease, opacity 0.3s ease"
              : "none",
        }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border bg-[#0a0a0b]/90 backdrop-blur ${
              willRefresh || refreshing
                ? "border-[#b4141e] text-[#e87a82] shadow-[0_0_18px_rgba(180,20,30,0.5)]"
                : "border-white/15 text-white/50"
            }`}
            style={{
              transform: refreshing
                ? "rotate(360deg)"
                : `rotate(${pullProgress * 360}deg)`,
              animation: refreshing ? "spin 0.7s linear infinite" : "none",
            }}
          >
            ↻
          </div>
          <p className="text-[9px] uppercase tracking-[0.35em] text-white/50">
            {refreshing ? "Refreshing" : willRefresh ? "Release" : "Pull"}
          </p>
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${visibleOffset}px)`,
          transition: refreshing || pullY === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        <div className="mx-auto max-w-2xl px-5 pt-6">
          <div className="space-y-6">
            {feedLoading && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex animate-pulse items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded-full bg-white/10" />
                    <div className="h-2 w-44 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            )}

            {posts.map((p) => {
              const count = likeCounts[p.id] ?? p.likes;
              const isLiked = !!liked[p.id];
              const isBookmarked = !!bookmarked[p.id];
              const photos = p.photos ?? [];

              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]"
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10">
                      {p.author.photo ? (
                        <Image
                          src={p.author.photo}
                          alt={p.author.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#b4141e] font-serif italic text-white">
                          CS
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="break-words text-sm text-white">{p.author.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                        {p.author.handle}
                        {p.location && ` · ${p.location}`}
                      </p>
                    </div>

                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                      {p.timeLabel}
                    </span>
                  </div>

                  {p.type === "photo" && photos.length > 0 && (
                    <div
                      ref={(el) => {
                        carouselRefs.current[p.id] = el;
                      }}
                      className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
                    >
                      {photos.map((src, idx) => (
                        <div
                          key={`${p.id}-${idx}`}
                          className="relative aspect-square w-full flex-shrink-0 snap-center bg-black"
                        >
                          <Image
                            src={src}
                            alt={`${p.author.name} post image ${idx + 1}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 768px"
                            quality={92}
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

                  {p.type === "reel" && (
                    <div className="relative aspect-[9/16] max-h-[560px] bg-black">
                      {p.video ? (
                        <video
                          src={p.video}
                          className="h-full w-full object-cover"
                          muted
                          autoPlay
                          loop
                          playsInline
                          preload="metadata"
                        />
                      ) : photos[0] ? (
                        <Image
                          src={photos[0]}
                          alt={`${p.author.name} reel cover`}
                          fill
                          sizes="(max-width: 768px) 100vw, 768px"
                          quality={90}
                          className="object-cover"
                        />
                      ) : p.mediaStatus === "queued" || p.mediaStatus === "processing" ? (
                        <div className="flex h-full w-full items-center justify-center px-6 text-center">
                          <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
                            Reel processing for cinematic playback
                          </p>
                        </div>
                      ) : null}

                      {p.sound && (
                        <div className="absolute bottom-3 left-3 right-3 flex">
                          <CrimsonSoundAttribution sound={p.sound} compact />
                        </div>
                      )}
                    </div>
                  )}

                  {p.type === "status" && p.statusText && (
                    <div
                      className={`flex min-h-[260px] items-center justify-center p-8 ${
                        statusBgMap[p.statusBg || "noir"] || statusBgMap.noir
                      }`}
                    >
                      <p className="text-center font-serif text-2xl italic text-white">
                        {p.statusText}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 px-4 pt-3">
                    <button
                      onClick={() => toggleLike(p.id)}
                      className="flex items-center gap-1.5"
                      aria-label="Like"
                    >
                      <span
                        className={`text-2xl transition-transform ${
                          isLiked ? "text-[#b4141e]" : "text-white/70"
                        } ${popId === p.id ? "scale-125" : ""}`}
                      >
                        {isLiked ? "♥" : "♡"}
                      </span>
                      <span className="text-xs text-white/70">{count}</span>
                    </button>

                    <button
                      onClick={() => setCommentSheet(p.id)}
                      className="flex items-center gap-1.5 text-white/70 hover:text-white"
                      aria-label="Comment"
                    >
                      <span className="text-xl">💬</span>
                      <span className="text-xs">{p.comments}</span>
                    </button>

                    <button
                      onClick={() => setShareSheet(p.id)}
                      className="text-xl text-white/70 hover:text-white"
                      aria-label="Share"
                    >
                      ↗
                    </button>

                    <button
                      onClick={() => toggleBookmark(p.id)}
                      className={`ml-auto text-2xl transition ${
                        isBookmarked ? "text-[#e87a82]" : "text-white/70"
                      }`}
                      aria-label="Bookmark"
                    >
                      {isBookmarked ? "▰" : "▱"}
                    </button>
                  </div>

                  {p.type !== "status" && p.caption && (
                    <p className="px-4 pb-2 pt-2 text-sm text-white/85">
                      <span className="text-white">{p.author.handle}</span> {p.caption}
                    </p>
                  )}

                  {p.type === "photo" && p.sound && (
                    <div className="px-4 pb-2 pt-2">
                      <CrimsonSoundAttribution sound={p.sound} compact />
                    </div>
                  )}

                  {p.taggedRiders && p.taggedRiders.length > 0 && (
                    <p className="px-4 pb-4 text-[11px] text-[#e87a82]">
                      with {p.taggedRiders.join(" · ")}
                    </p>
                  )}

                  {(p.type === "status" ||
                    (!p.caption && (!p.taggedRiders || p.taggedRiders.length === 0))) && (
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
        </div>
      </div>

      {commentSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setCommentSheet(null)}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-[#0a0a0b] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                  Reply
                </p>
                <h2 className="font-serif text-2xl italic text-white">
                  Comments
                </h2>
              </div>
              <button
                onClick={() => setCommentSheet(null)}
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/70 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="mb-4 space-y-3 text-sm text-white/60">
              <p>No comments yet. Be the first to weigh in.</p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder="Say something..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              <button
                onClick={sendComment}
                className="rounded-full bg-[#b4141e] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-[#d11827]"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {shareSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShareSheet(null)}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-[#0a0a0b] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                Send to
              </p>
              <h2 className="font-serif text-2xl italic text-white">Share</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShare("Copied link.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  Copy Link
                </p>
                <p className="mt-1 text-[10px] text-white/40">
                  crimsonsociety.app/...
                </p>
              </button>

              <button
                onClick={() => handleShare("Added to story.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  Add to Story
                </p>
                <p className="mt-1 text-[10px] text-white/40">Visible 24h</p>
              </button>

              <button
                onClick={() => handleShare("Reposted.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  Repost
                </p>
                <p className="mt-1 text-[10px] text-white/40">To your feed</p>
              </button>

              <button
                onClick={() => handleShare("Sent in DM.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  Send DM
                </p>
                <p className="mt-1 text-[10px] text-white/40">Pick a rider</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
          {toast}
        </div>
      )}
    </main>
  );
}
