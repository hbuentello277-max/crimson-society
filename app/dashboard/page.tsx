"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PostType = "photo" | "reel" | "status";

type LocalPost = {
  id: string;
  type: PostType;
  caption: string;
  location: string;
  taggedRiders: string[];
  audience: string;
  photos: string[];
  video: string | null;
  musicLabel: string;
  statusText: string;
  statusBg: string;
  createdAt: string;
  author: { name: string; handle: string; photo: string | null };
};

type FeedPost = {
  id: string;
  type: PostType;
  author: { name: string; handle: string; photo: string | null };
  location?: string;
  caption?: string;
  photos?: string[];
  video?: string | null;
  musicLabel?: string;
  statusText?: string;
  statusBg?: string;
  taggedRiders?: string[];
  timeLabel: string;
  likes: number;
  comments: number;
  isLocal?: boolean;
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
    musicLabel: "King Krule — Easy Easy",
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

function localToFeed(p: LocalPost): FeedPost {
  return {
    id: p.id,
    type: p.type,
    author: p.author,
    location: p.location,
    caption: p.caption,
    photos: p.photos,
    video: p.video,
    musicLabel: p.musicLabel,
    statusText: p.statusText,
    statusBg: p.statusBg,
    taggedRiders: p.taggedRiders,
    timeLabel: timeAgo(p.createdAt),
    likes: 0,
    comments: 0,
    isLocal: true,
  };
}

const PULL_THRESHOLD = 70;
const MAX_PULL = 120;

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    async function checkUser() {
      const {
        data:  { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    }
    checkUser();
  }, [router]);

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
  const [pullY, setPullY] = useState(0);
  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef<boolean>(false);
 
  const loadFeed = async () => {
      const { data, error } = await supabase
      .from("Posts")
      .select("*")
      .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        return;
      }
const livePosts = (data || []).map((post) => ({
      id: post.id,
      type: "photo",
      caption: post.caption || "",
      location: "",
      taggedRiders: [],
      audience: "public",
      photos: post.image_url ? [post.image_url] : [],
      video: null,
      musicLabel: "",
      statusText: "",
      statusBg: "",
      createdAt: post.created_at,
      author: {
        name: post.author_name || "Unknown",
        handle: post.author_handle || "@unknown",
        photo: post.author_photo || null,
      },
      timeLabel: timeAgo(post.created_at),
      likes: 0,
      comments: [],
      islocal: false,
    })); 
      setPosts([...livePosts, ...seedPosts] as FeedPost[]);
  };

  useEffect(() => {
    void loadFeed();
    const onFocus = () => void loadFeed();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

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

  // ─── Pull-to-refresh handlers ────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 4 || refreshing) return;
    pullStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || pullStartY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (delta > 0 && window.scrollY <= 4) {
      // Resistance curve so it feels weighty
      const damped = Math.min(MAX_PULL, delta * 0.5);
      setPullY(damped);
    } else if (delta <= 0) {
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

  // Mouse drag (so it also works on desktop / trackpad without touch)
  const mouseStartY = useRef<number | null>(null);
  const isMouseDown = useRef(false);

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
    } else if (delta <= 0) {
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
  // ─────────────────────────────────────────────────────────────────────

  const toggleLike = (id: string) => {
    const wasLiked = liked[id];
    setLiked((prev) => ({ ...prev, [id]: !wasLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + (wasLiked ? -1 : 1),
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

  const deleteLocal = (id: string) => {
    try {
      const raw = localStorage.getItem("cs_posts");
      const local: LocalPost[] = raw ? JSON.parse(raw) : [];
      const filtered = local.filter((p) => p.id !== id);
      localStorage.setItem("cs_posts", JSON.stringify(filtered));
    } catch {}
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setToast("Post removed.");
    setTimeout(() => setToast(null), 1400);
  };

  const visibleOffset = refreshing ? PULL_THRESHOLD : pullY;
  const pullProgress = Math.min(1, pullY / PULL_THRESHOLD);
  const willRefresh = pullY >= PULL_THRESHOLD;

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
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">The Feed</p>
            <h1 className="font-serif text-2xl italic text-white">Crimson Society</h1>
          </div>
          <Link
            href="/create"
            className="rounded-full bg-[#b4141e] px-4 py-2 text-xs uppercase tracking-[0.25em] text-white shadow-[0_0_20px_rgba(180,20,30,0.35)] hover:bg-[#d11827]"
          >
            + Post
          </Link>
        </div>
      </header>

      {/* Pull-to-refresh indicator */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-30 flex items-center justify-center"
        style={{
          height: `${visibleOffset}px`,
          opacity: visibleOffset > 6 ? 1 : 0,
          transition: refreshing || pullY === 0 ? "height 0.3s ease, opacity 0.3s ease" : "none",
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
              transition: refreshing ? "transform 0.7s linear infinite" : "none",
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

      {/* Feed content (translates down while pulling) */}
      <div
        style={{
          transform: `translateY(${visibleOffset}px)`,
          transition: refreshing || pullY === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        <div className="mx-auto max-w-2xl px-5 pt-6">
          {/* Feed */}
          <div className="space-y-6">
            {posts.map((p) => {
              const count = likeCounts[p.id] ?? p.likes;
              const isLiked = !!liked[p.id];
              const isBookmarked = !!bookmarked[p.id];

              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]"
                >
                  {/* Author row */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10">
                      {p.author.photo ? (
                        <Image src={p.author.photo} alt={p.author.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#b4141e] font-serif italic text-white">
                          CS
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{p.author.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                        {p.author.handle}
                        {p.location && ` · ${p.location}`}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                      {p.timeLabel}
                    </span>
                    {p.isLocal && (
                      <button
                        onClick={() => deleteLocal(p.id)}
                        className="ml-2 rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/40 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
                        aria-label="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  {p.type === "photo" && p.photos && p.photos.length > 0 && (
                    <div
                      ref={(el) => {
                        carouselRefs.current[p.id] = el;
                      }}
                      className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
                    >
                      {p.photos.map((src, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square w-full flex-shrink-0 snap-center bg-black"
                        >
                          {p.isLocal ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Image src={src} alt="" fill className="object-cover" />
                          )}
                          {p.photos!.length > 1 && (
                            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur">
                              {idx + 1} / {p.photos!.length}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {p.type === "reel" && (
                    <div className="relative aspect-[9/16] max-h-[560px] bg-black">
                      {p.video ? (
                        /* eslint-disable-next-line jsx-a11y/media-has-caption */
                        <video
                          src={p.video}
                          className="h-full w-full object-cover"
                          muted
                          autoPlay
                          loop
                          playsInline
                        />
                      ) : p.photos && p.photos[0] ? (
                        <Image src={p.photos[0]} alt="" fill className="object-cover" />
                      ) : null}
                      {p.musicLabel && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-white backdrop-blur">
                          <span className="text-[#e87a82]">♪</span>
                          {p.musicLabel}
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

                  {/* Action row */}
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

                  {/* Caption */}
                  {p.type !== "status" && p.caption && (
                    <p className="px-4 pb-2 pt-2 text-sm text-white/85">
                      <span className="text-white">{p.author.handle}</span> {p.caption}
                    </p>
                  )}

                  {/* Tagged */}
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

          {/* Footer ornament */}
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

      {/* Comment sheet */}
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
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Reply</p>
                <h2 className="font-serif text-2xl italic text-white">Comments</h2>
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

      {/* Share sheet */}
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
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Send to</p>
              <h2 className="font-serif text-2xl italic text-white">Share</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShare("Copied link.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">Copy Link</p>
                <p className="mt-1 text-[10px] text-white/40">crimsonsociety.app/...</p>
              </button>
              <button
                onClick={() => handleShare("Added to story.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">Add to Story</p>
                <p className="mt-1 text-[10px] text-white/40">Visible 24h</p>
              </button>
              <button
                onClick={() => handleShare("Reposted.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">Repost</p>
                <p className="mt-1 text-[10px] text-white/40">To your feed</p>
              </button>
              <button
                onClick={() => handleShare("Sent in DM.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">Send DM</p>
                <p className="mt-1 text-[10px] text-white/40">Pick a rider</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
          {toast}
        </div>
      )}
    </main>
  );
}

function loadFeed() {
  throw new Error("Function not implemented.");
}
