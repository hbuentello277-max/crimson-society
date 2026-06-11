"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { authedFetch } from "@/lib/auth/authed-fetch";
import { fetchBlockState, getBlockedUserIds } from "@/lib/blocking";
import {
  DASHBOARD_MAX_PULL,
  DASHBOARD_PULL_THRESHOLD,
  FEED_FOCUS_RELOAD_DEBOUNCE_MS,
  FEED_POST_LIMIT,
} from "@/lib/dashboard/constants";
import { mapPostToFeed } from "@/lib/dashboard/map-post-to-feed";
import type { DashboardFeedPost, DashboardRawPost } from "@/lib/dashboard/types";
import { supabase } from "@/lib/supabase";
import type { PostActionTarget } from "@/components/social/PostActionSheet";

type UseDashboardFeedOptions = {
  session: Session | null;
  isAdmin: boolean;
  deepLinkPostId: string | null;
  deepLinkCommentId: string | null;
  onToast: (message: string) => void;
};

export function useDashboardFeed({
  session,
  isAdmin,
  deepLinkPostId,
  deepLinkCommentId,
  onToast,
}: UseDashboardFeedOptions) {
  const [posts, setPosts] = useState<DashboardFeedPost[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [popId, setPopId] = useState<string | null>(null);
  const [commentSheet, setCommentSheet] = useState<string | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [shareSheet, setShareSheet] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [pullY, setPullY] = useState(0);
  const [postActionTarget, setPostActionTarget] = useState<PostActionTarget | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [reportPostTarget, setReportPostTarget] = useState<{
    postId: string;
    authorId: string;
    authorName: string;
  } | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);

  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const postRefs = useRef<Record<string, HTMLElement | null>>({});
  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const mouseStartY = useRef<number | null>(null);
  const isMouseDown = useRef(false);
  const feedFocusReloadTimerRef = useRef<number | null>(null);

  const loadFeed = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session) return;

      if (!options?.silent) {
        setFeedLoading(true);
      }
      const { data, error } = await supabase
        .from("Posts")
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
        media_metadata,
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
        .order("created_at", { ascending: false })
        .limit(FEED_POST_LIMIT);

      if (error) {
        if (!options?.silent) {
          onToast(error.message || "Could not load posts.");
          setFeedLoading(false);
        }
        return;
      }

      const livePosts = ((data || []) as DashboardRawPost[]).map(mapPostToFeed);

      let visiblePosts = livePosts;

      if (session.user.id) {
        const authorIds = Array.from(
          new Set(livePosts.map((post) => post.userId).filter(Boolean)),
        ) as string[];
        const postIds = livePosts.map((post) => post.id);
        const blockState = await fetchBlockState(session.user.id);
        const blockedUserIds = getBlockedUserIds(blockState);

        const [{ data: hiddenRows }, { data: muteRows }] = await Promise.all([
          postIds.length
            ? supabase
                .from("hidden_posts")
                .select("post_id")
                .eq("user_id", session.user.id)
                .in("post_id", postIds)
            : Promise.resolve({ data: [] as { post_id: string }[] }),
          authorIds.length
            ? supabase
                .from("rider_mutes")
                .select("muted_user_id")
                .eq("user_id", session.user.id)
                .eq("mute_posts", true)
                .in("muted_user_id", authorIds)
            : Promise.resolve({ data: [] as { muted_user_id: string }[] }),
        ]);
        const hiddenPostIds = new Set((hiddenRows || []).map((row) => row.post_id));
        const mutedAuthorIds = new Set((muteRows || []).map((row) => row.muted_user_id));
        visiblePosts = livePosts.filter(
          (post) =>
            !hiddenPostIds.has(post.id) &&
            !(post.userId && mutedAuthorIds.has(post.userId)) &&
            !(post.userId && blockedUserIds.has(post.userId)),
        );
      }

      setPosts(visiblePosts);

      const livePostIds = visiblePosts.map((post) => post.id);

      if (livePostIds.length > 0) {
        const { data: userLikes, error: likesError } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", session.user.id)
          .in("post_id", livePostIds);

        if (!likesError) {
          const likedMap: Record<string, boolean> = {};

          for (const like of userLikes || []) {
            likedMap[String(like.post_id)] = true;
          }

          setLiked(likedMap);
        }

        if (livePostIds.length > 0) {
          const { data: savedRows } = await supabase
            .from("saved_posts")
            .select("post_id")
            .eq("user_id", session.user.id)
            .in("post_id", livePostIds);
          const savedMap: Record<string, boolean> = {};
          for (const row of savedRows || []) savedMap[String(row.post_id)] = true;
          setBookmarked(savedMap);
        }
      }

      if (!options?.silent) {
        setFeedLoading(false);
      }
    },
    [onToast, session],
  );

  const hasPendingReels = posts.some(
    (post) =>
      post.type === "reel" &&
      (post.mediaStatus === "queued" || post.mediaStatus === "processing"),
  );

  useEffect(() => {
    if (!session || !hasPendingReels) return;

    const interval = window.setInterval(() => {
      void loadFeed({ silent: true });
    }, 12_000);

    return () => window.clearInterval(interval);
  }, [hasPendingReels, loadFeed, session]);

  useEffect(() => {
    if (!deepLinkPostId || feedLoading || posts.length === 0) return;

    const targetPost = posts.find((post) => post.id === deepLinkPostId);
    if (!targetPost) return;

    setHighlightedPostId(deepLinkPostId);
    if (deepLinkCommentId) {
      setCommentSheet(deepLinkPostId);
    }

    window.requestAnimationFrame(() => {
      postRefs.current[deepLinkPostId]?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    const timer = window.setTimeout(() => setHighlightedPostId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [deepLinkCommentId, deepLinkPostId, feedLoading, posts]);

  useEffect(() => {
    if (!session) return;

    const timer = window.setTimeout(() => {
      void loadFeed();
    }, 0);

    const onFocus = () => {
      if (feedFocusReloadTimerRef.current) {
        window.clearTimeout(feedFocusReloadTimerRef.current);
      }
      feedFocusReloadTimerRef.current = window.setTimeout(() => {
        feedFocusReloadTimerRef.current = null;
        void loadFeed();
      }, FEED_FOCUS_RELOAD_DEBOUNCE_MS);
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(timer);
      if (feedFocusReloadTimerRef.current) {
        window.clearTimeout(feedFocusReloadTimerRef.current);
        feedFocusReloadTimerRef.current = null;
      }
      window.removeEventListener("focus", onFocus);
    };
  }, [loadFeed, session]);

  const doRefresh = useCallback(() => {
    if (refreshing) return;

    setRefreshing(true);

    window.setTimeout(() => {
      void loadFeed();
      setRefreshing(false);
      setPullY(0);
      onToast("Feed refreshed.");
    }, 700);
  }, [loadFeed, onToast, refreshing]);

  const deletePost = useCallback(
    async (post: DashboardFeedPost) => {
      const currentUserId = session?.user?.id;
      const canDelete = Boolean(
        post.userId && currentUserId && (post.userId === currentUserId || isAdmin),
      );

      if (!canDelete || deletingPostId) return;

      const confirmed = window.confirm("Delete this post? This cannot be undone.");
      if (!confirmed) return;

      setDeletingPostId(post.id);
      setPostActionTarget(null);

      const response = await authedFetch(`/api/posts/${post.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      const error = response.ok ? null : { message: payload.error || "Could not delete post." };

      if (error) {
        onToast(error.message || "Could not delete post.");
        setDeletingPostId(null);
        return;
      }

      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      setLiked((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      setLikeCounts((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      setBookmarked((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });

      setDeletingPostId(null);
      onToast("Post deleted.");
    },
    [deletingPostId, isAdmin, onToast, session?.user?.id],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (window.scrollY > 4 || refreshing) return;
      pullStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [refreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || pullStartY.current === null || refreshing) return;

      const delta = e.touches[0].clientY - pullStartY.current;

      if (delta > 0 && window.scrollY <= 4) {
        const damped = Math.min(DASHBOARD_MAX_PULL, delta * 0.5);
        setPullY(damped);
      } else {
        setPullY(0);
      }
    },
    [refreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;

    isPulling.current = false;
    pullStartY.current = null;

    if (pullY >= DASHBOARD_PULL_THRESHOLD) {
      doRefresh();
    } else {
      setPullY(0);
    }
  }, [doRefresh, pullY]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (window.scrollY > 4 || refreshing) return;
      mouseStartY.current = e.clientY;
      isMouseDown.current = true;
    },
    [refreshing],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMouseDown.current || mouseStartY.current === null || refreshing) return;

      const delta = e.clientY - mouseStartY.current;

      if (delta > 0 && window.scrollY <= 4) {
        const damped = Math.min(DASHBOARD_MAX_PULL, delta * 0.5);
        setPullY(damped);
      } else {
        setPullY(0);
      }
    },
    [refreshing],
  );

  const handleMouseUp = useCallback(() => {
    if (!isMouseDown.current) return;

    isMouseDown.current = false;
    mouseStartY.current = null;

    if (pullY >= DASHBOARD_PULL_THRESHOLD) {
      doRefresh();
    } else {
      setPullY(0);
    }
  }, [doRefresh, pullY]);

  const toggleLike = useCallback(
    async (id: string) => {
      const userId = session?.user?.id;
      if (!userId) return;

      const wasLiked = liked[id];

      setLiked((prev) => ({ ...prev, [id]: !wasLiked }));
      setLikeCounts((prev) => ({
        ...prev,
        [id]: (prev[id] ?? posts.find((p) => p.id === id)?.likes ?? 0) + (wasLiked ? -1 : 1),
      }));

      const { error } = wasLiked
        ? await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", userId)
        : await supabase.from("post_likes").insert({ post_id: id, user_id: userId });

      if (error) {
        setLiked((prev) => ({ ...prev, [id]: wasLiked }));
        setLikeCounts((prev) => ({
          ...prev,
          [id]: (prev[id] ?? posts.find((p) => p.id === id)?.likes ?? 0) + (wasLiked ? 1 : -1),
        }));
        onToast(error.message || "Could not update like.");
        return;
      }

      if (!wasLiked) {
        setPopId(id);
        window.setTimeout(() => setPopId(null), 400);
      }
    },
    [liked, onToast, posts, session?.user?.id],
  );

  const toggleBookmark = useCallback(
    (id: string) => {
      setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
      onToast(bookmarked[id] ? "Removed from saved." : "Saved to your dossier.");
    },
    [bookmarked, onToast],
  );

  const sendComment = useCallback(async () => {
    const userId = session?.user?.id;
    const postId = commentSheet;
    const body = commentDraft.trim();

    if (!userId || !postId || !body) return;

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: userId,
      body,
    });

    if (error) {
      onToast(error.message || "Could not post comment.");
      return;
    }

    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, comments: post.comments + 1 } : post)),
    );

    setCommentDraft("");
    setCommentSheet(null);
    onToast("Comment posted.");
  }, [commentDraft, commentSheet, onToast, session?.user?.id]);

  const handleShare = useCallback(
    (action: string) => {
      setShareSheet(null);
      onToast(action);
    },
    [onToast],
  );

  const visibleOffset = refreshing ? DASHBOARD_PULL_THRESHOLD : pullY;
  const pullProgress = Math.min(1, pullY / DASHBOARD_PULL_THRESHOLD);
  const willRefresh = pullY >= DASHBOARD_PULL_THRESHOLD;

  return {
    posts,
    setPosts,
    liked,
    likeCounts,
    bookmarked,
    popId,
    commentSheet,
    setCommentSheet,
    highlightedPostId,
    shareSheet,
    setShareSheet,
    commentDraft,
    setCommentDraft,
    refreshing,
    feedLoading,
    pullY,
    postActionTarget,
    setPostActionTarget,
    deletingPostId,
    reportPostTarget,
    setReportPostTarget,
    reportBusy,
    setReportBusy,
    activeReelId,
    setActiveReelId,
    carouselRefs,
    postRefs,
    loadFeed,
    deletePost,
    toggleLike,
    toggleBookmark,
    sendComment,
    handleShare,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    visibleOffset,
    pullProgress,
    willRefresh,
  };
}
