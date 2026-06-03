"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionBottomSheet, type ActionSheetItem } from "@/components/ui/ActionBottomSheet";
import {
  hidePost,
  isFavoriteRider,
  isPostSaved,
  pinPostToProfile,
  postShareUrl,
  profileShareUrl,
  setRiderMutePosts,
  shareUrl,
  toggleFavoriteRider,
  toggleSavedPost,
} from "@/lib/social/actions";
import { supabase } from "@/lib/supabase";

export type PostActionTarget = {
  postId: string;
  authorId: string;
  authorUsername: string | null;
  authorName: string;
  isOwner: boolean;
  isPinned?: boolean;
};

type Props = {
  open: boolean;
  target: PostActionTarget | null;
  onClose: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onHidden?: (postId: string) => void;
  onToast?: (message: string) => void;
};

export function PostActionSheet({
  open,
  target,
  onClose,
  onReport,
  onEdit,
  onDelete,
  onHidden,
  onToast,
}: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !target) return;

    void supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const [savedState, favoriteState, muteRow, postRow] = await Promise.all([
        isPostSaved(supabase, uid, target.postId),
        isFavoriteRider(supabase, uid, target.authorId),
        supabase
          .from("rider_mutes")
          .select("mute_posts")
          .eq("user_id", uid)
          .eq("muted_user_id", target.authorId)
          .maybeSingle(),
        supabase.from("Posts").select("pinned_at").eq("id", target.postId).maybeSingle(),
      ]);

      setSaved(savedState);
      setFavorited(favoriteState);
      setMuted(Boolean(muteRow.data?.mute_posts));
      setPinned(Boolean(postRow.data?.pinned_at) || Boolean(target.isPinned));
    });
  }, [open, target]);

  const profileHref = target?.authorUsername
    ? `/profile/${target.authorUsername.replace(/^@+/, "")}`
    : null;

  const items = useMemo<ActionSheetItem[]>(() => {
    if (!target || !userId) return [];

    const toast = (message: string) => onToast?.(message);

    const common: ActionSheetItem[] = target.isOwner
      ? []
      : [
          {
            key: "save",
            icon: "🔖",
            label: saved ? "Unsave Post" : "Save Post",
            onSelect: async () => {
              const result = await toggleSavedPost(supabase, userId, target.postId);
              if (result.error) {
                toast(result.error);
                return;
              }
              setSaved(result.saved);
              toast(result.saved ? "Post saved." : "Removed from Saved.");
            },
          },
          {
            key: "share",
            icon: "📤",
            label: "Share Post",
            onSelect: async () => {
              try {
                const url = postShareUrl(target.postId);
                const mode = await shareUrl(target.authorName, url, "Check out this Crimson Society post");
                toast(mode === "shared" ? "Shared." : "Post link copied.");
              } catch {
                toast("Could not share post.");
              }
            },
          },
          {
            key: "favorite",
            icon: "⭐",
            label: favorited ? "Remove From Favorites" : "Add To Favorites",
            onSelect: async () => {
              const result = await toggleFavoriteRider(supabase, userId, target.authorId);
              if (result.error) {
                toast(result.error);
                return;
              }
              setFavorited(result.favorited);
              toast(result.favorited ? "Rider added to Favorites." : "Removed from Favorites.");
            },
          },
          {
            key: "hide",
            icon: "🙈",
            label: "Hide Post",
            onSelect: async () => {
              const result = await hidePost(supabase, userId, target.postId);
              if (result.error) {
                toast(result.error);
                return;
              }
              onHidden?.(target.postId);
              toast("Post hidden from your feed.");
            },
          },
          {
            key: "profile",
            icon: "👤",
            label: "View Rider Profile",
            onSelect: () => {
              if (profileHref) router.push(profileHref);
            },
          },
          {
            key: "mute",
            icon: "🔇",
            label: muted ? "Unmute Rider Posts" : "Mute Rider",
            onSelect: async () => {
              const result = await setRiderMutePosts(supabase, userId, target.authorId, !muted);
              if (result.error) {
                toast(result.error);
                return;
              }
              setMuted(!muted);
              toast(!muted ? "Future posts from this rider are muted." : "Rider unmuted.");
            },
          },
        ];

    const owner: ActionSheetItem[] = target.isOwner
      ? [
          {
            key: "save",
            icon: "🔖",
            label: saved ? "Unsave Post" : "Save Post",
            onSelect: async () => {
              const result = await toggleSavedPost(supabase, userId, target.postId);
              if (result.error) {
                toast(result.error);
                return;
              }
              setSaved(result.saved);
              toast(result.saved ? "Post saved." : "Removed from Saved.");
            },
          },
          {
            key: "share",
            icon: "📤",
            label: "Share Post",
            onSelect: async () => {
              try {
                const url = postShareUrl(target.postId);
                const mode = await shareUrl("My Crimson Society post", url);
                toast(mode === "shared" ? "Shared." : "Post link copied.");
              } catch {
                toast("Could not share post.");
              }
            },
          },
          {
            key: "pin",
            icon: "📌",
            label: pinned ? "Unpin From Profile" : "Pin To Profile",
            onSelect: async () => {
              const result = await pinPostToProfile(supabase, userId, target.postId, !pinned);
              if (result.error) {
                toast(result.error);
                return;
              }
              setPinned(!pinned);
              toast(!pinned ? "Pinned to profile." : "Unpinned from profile.");
            },
          },
          {
            key: "edit",
            icon: "✏️",
            label: "Edit Post",
            onSelect: () => onEdit?.(),
          },
          {
            key: "delete",
            icon: "🗑",
            label: "Delete Post",
            tone: "danger",
            onSelect: () => onDelete?.(),
          },
        ]
      : [];

    const report: ActionSheetItem[] =
      !target.isOwner && onReport
        ? [
            {
              key: "report",
              icon: "🚩",
              label: "Report Post",
              tone: "danger",
              onSelect: () => onReport(),
            },
          ]
        : [];

    return [...common, ...owner, ...report];
  }, [
    favorited,
    muted,
    onDelete,
    onEdit,
    onHidden,
    onReport,
    onToast,
    pinned,
    profileHref,
    router,
    saved,
    target,
    userId,
  ]);

  return (
    <ActionBottomSheet
      open={open}
      title="Post Options"
      subtitle={target ? `Post by ${target.authorName}` : undefined}
      items={items}
      onClose={onClose}
    />
  );
}
