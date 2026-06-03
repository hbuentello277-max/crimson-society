"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionBottomSheet, type ActionSheetItem } from "@/components/ui/ActionBottomSheet";
import {
  copyTextToClipboard,
  getRiderMuteState,
  isFavoriteRider,
  isSubscribedToHostMeets,
  profileShareUrl,
  setRiderMuteInvites,
  setRiderMutePosts,
  shareUrl,
  toggleFavoriteRider,
  toggleHostMeetSubscription,
} from "@/lib/social/actions";
import { supabase } from "@/lib/supabase";

export type ProfileActionTarget = {
  profileId: string;
  username: string | null;
  displayName: string;
  isOwnProfile: boolean;
  isBlocked?: boolean;
};

type Props = {
  open: boolean;
  target: ProfileActionTarget | null;
  onClose: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  onToast?: (message: string) => void;
};

export function ProfileActionSheet({
  open,
  target,
  onClose,
  onReport,
  onBlock,
  onToast,
}: Props) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [mutePosts, setMutePosts] = useState(false);
  const [muteInvites, setMuteInvites] = useState(false);

  const profilePath = target?.username
    ? `/profile/${target.username.replace(/^@+/, "")}`
    : null;

  useEffect(() => {
    if (!open || !target || target.isOwnProfile) return;

    void supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const [favoriteState, subscriptionState, muteState] = await Promise.all([
        isFavoriteRider(supabase, uid, target.profileId),
        isSubscribedToHostMeets(supabase, uid, target.profileId),
        getRiderMuteState(supabase, uid, target.profileId),
      ]);

      setFavorited(favoriteState);
      setSubscribed(subscriptionState);
      setMutePosts(Boolean(muteState?.mutePosts));
      setMuteInvites(Boolean(muteState?.muteInvites));
    });
  }, [open, target]);

  const items = useMemo<ActionSheetItem[]>(() => {
    if (!target || !userId) return [];
    const toast = (message: string) => onToast?.(message);

    if (target.isOwnProfile) {
      return [
        {
          key: "share",
          icon: "📤",
          label: "Share Profile",
          onSelect: async () => {
            const url = profileShareUrl(target.username);
            if (!url) return;
            try {
              const mode = await shareUrl(target.displayName, url);
              toast(mode === "shared" ? "Shared." : "Profile link copied.");
            } catch {
              toast("Could not share profile.");
            }
          },
        },
        {
          key: "settings",
          icon: "⚙️",
          label: "Account Settings",
          onSelect: () => router.push("/profile/edit"),
        },
        {
          key: "copy",
          icon: "🔗",
          label: "Copy Profile Link",
          onSelect: async () => {
            const url = profileShareUrl(target.username);
            if (!url) return;
            try {
              await copyTextToClipboard(url);
              toast("Profile link copied.");
            } catch {
              toast("Could not copy link.");
            }
          },
        },
      ];
    }

    return [
      {
        key: "favorite",
        icon: "⭐",
        label: favorited ? "Remove From Favorites" : "Add To Favorites",
        onSelect: async () => {
          const result = await toggleFavoriteRider(supabase, userId, target.profileId);
          if (result.error) {
            toast(result.error);
            return;
          }
          setFavorited(result.favorited);
          toast(result.favorited ? "Added to Favorites." : "Removed from Favorites.");
        },
      },
      {
        key: "message",
        icon: "💬",
        label: "Message Rider",
        onSelect: () => router.push(`/inbox?peer=${target.profileId}`),
      },
      {
        key: "share",
        icon: "📤",
        label: "Share Profile",
        onSelect: async () => {
          const url = profileShareUrl(target.username);
          if (!url) return;
          try {
            const mode = await shareUrl(target.displayName, url);
            toast(mode === "shared" ? "Shared." : "Profile link copied.");
          } catch {
            toast("Could not share profile.");
          }
        },
      },
      {
        key: "copy",
        icon: "🔗",
        label: "Copy Profile Link",
        onSelect: async () => {
          const url = profileShareUrl(target.username);
          if (!url) return;
          try {
            await copyTextToClipboard(url);
            toast("Profile link copied.");
          } catch {
            toast("Could not copy link.");
          }
        },
      },
      {
        key: "meets",
        icon: "🏍",
        label: "View Hosted Meets",
        onSelect: () => {
          if (profilePath) router.push(`${profilePath}?tab=rides`);
        },
      },
      {
        key: "garage",
        icon: "🏍",
        label: "View Garage",
        onSelect: () => {
          if (profilePath) router.push(`${profilePath}?tab=garage`);
        },
      },
      {
        key: "notify-meets",
        icon: "🔔",
        label: subscribed ? "Stop Meet Notifications" : "Notify Me About Meets",
        onSelect: async () => {
          const result = await toggleHostMeetSubscription(supabase, userId, target.profileId);
          if (result.error) {
            toast(result.error);
            return;
          }
          setSubscribed(result.subscribed);
          toast(
            result.subscribed
              ? "You will be notified when this host creates meets."
              : "Meet notifications turned off.",
          );
        },
      },
      {
        key: "mute-posts",
        icon: "🔕",
        label: mutePosts ? "Unmute Posts" : "Mute Posts",
        onSelect: async () => {
          const result = await setRiderMutePosts(supabase, userId, target.profileId, !mutePosts);
          if (result.error) {
            toast(result.error);
            return;
          }
          setMutePosts(!mutePosts);
          toast(!mutePosts ? "Posts muted." : "Posts unmuted.");
        },
      },
      {
        key: "mute-invites",
        icon: "🔕",
        label: muteInvites ? "Unmute Ride Invites" : "Mute Ride Invites",
        onSelect: async () => {
          const result = await setRiderMuteInvites(supabase, userId, target.profileId, !muteInvites);
          if (result.error) {
            toast(result.error);
            return;
          }
          setMuteInvites(!muteInvites);
          toast(!muteInvites ? "Ride invites muted." : "Ride invites unmuted.");
        },
      },
      ...(onBlock
        ? [
            {
              key: "block",
              icon: "🚫",
              label: target.isBlocked ? "Unblock Rider" : "Block Rider",
              tone: "danger" as const,
              onSelect: () => onBlock(),
            },
          ]
        : []),
      ...(onReport
        ? [
            {
              key: "report",
              icon: "🚩",
              label: "Report Rider",
              tone: "danger" as const,
              onSelect: () => onReport(),
            },
          ]
        : []),
    ];
  }, [
    favorited,
    muteInvites,
    mutePosts,
    onBlock,
    onReport,
    onToast,
    profilePath,
    router,
    subscribed,
    target,
    userId,
  ]);

  return (
    <ActionBottomSheet
      open={open}
      title={target?.isOwnProfile ? "Your Profile" : "Rider Options"}
      subtitle={target?.displayName}
      items={items}
      onClose={onClose}
    />
  );
}
