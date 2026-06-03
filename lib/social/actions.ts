import type { SupabaseClient } from "@supabase/supabase-js";

export type RiderMuteState = {
  mutePosts: boolean;
  muteInvites: boolean;
};

export async function isFavoriteRider(
  client: SupabaseClient,
  userId: string,
  favoriteUserId: string,
) {
  const { data } = await client
    .from("favorite_riders")
    .select("id")
    .eq("user_id", userId)
    .eq("favorite_user_id", favoriteUserId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleFavoriteRider(
  client: SupabaseClient,
  userId: string,
  favoriteUserId: string,
) {
  const existing = await isFavoriteRider(client, userId, favoriteUserId);
  if (existing) {
    const { error } = await client
      .from("favorite_riders")
      .delete()
      .eq("user_id", userId)
      .eq("favorite_user_id", favoriteUserId);
    return { favorited: false, error: error?.message ?? null };
  }

  const { error } = await client.from("favorite_riders").insert({
    user_id: userId,
    favorite_user_id: favoriteUserId,
  });
  return { favorited: true, error: error?.message ?? null };
}

export async function isPostSaved(client: SupabaseClient, userId: string, postId: string) {
  const { data } = await client
    .from("saved_posts")
    .select("id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleSavedPost(client: SupabaseClient, userId: string, postId: string) {
  const saved = await isPostSaved(client, userId, postId);
  if (saved) {
    const { error } = await client
      .from("saved_posts")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    return { saved: false, error: error?.message ?? null };
  }

  const { error } = await client.from("saved_posts").insert({
    user_id: userId,
    post_id: postId,
  });
  return { saved: true, error: error?.message ?? null };
}

export async function hidePost(client: SupabaseClient, userId: string, postId: string) {
  const { error } = await client.from("hidden_posts").upsert(
    { user_id: userId, post_id: postId },
    { onConflict: "user_id,post_id" },
  );
  return { error: error?.message ?? null };
}

export async function getRiderMuteState(
  client: SupabaseClient,
  userId: string,
  mutedUserId: string,
): Promise<RiderMuteState | null> {
  const { data } = await client
    .from("rider_mutes")
    .select("mute_posts, mute_invites")
    .eq("user_id", userId)
    .eq("muted_user_id", mutedUserId)
    .maybeSingle();

  if (!data) return null;
  return {
    mutePosts: Boolean(data.mute_posts),
    muteInvites: Boolean(data.mute_invites),
  };
}

export async function setRiderMutePosts(
  client: SupabaseClient,
  userId: string,
  mutedUserId: string,
  muted: boolean,
) {
  if (!muted) {
    const state = await getRiderMuteState(client, userId, mutedUserId);
    if (state?.muteInvites) {
      const { error } = await client
        .from("rider_mutes")
        .update({ mute_posts: false })
        .eq("user_id", userId)
        .eq("muted_user_id", mutedUserId);
      return { error: error?.message ?? null };
    }
    const { error } = await client
      .from("rider_mutes")
      .delete()
      .eq("user_id", userId)
      .eq("muted_user_id", mutedUserId);
    return { error: error?.message ?? null };
  }

  const { error } = await client.from("rider_mutes").upsert(
    { user_id: userId, muted_user_id: mutedUserId, mute_posts: true },
    { onConflict: "user_id,muted_user_id" },
  );
  return { error: error?.message ?? null };
}

export async function setRiderMuteInvites(
  client: SupabaseClient,
  userId: string,
  mutedUserId: string,
  muted: boolean,
) {
  if (!muted) {
    const state = await getRiderMuteState(client, userId, mutedUserId);
    if (state?.mutePosts) {
      const { error } = await client
        .from("rider_mutes")
        .update({ mute_invites: false })
        .eq("user_id", userId)
        .eq("muted_user_id", mutedUserId);
      return { error: error?.message ?? null };
    }
    const { error } = await client
      .from("rider_mutes")
      .delete()
      .eq("user_id", userId)
      .eq("muted_user_id", mutedUserId);
    return { error: error?.message ?? null };
  }

  const { error } = await client.from("rider_mutes").upsert(
    { user_id: userId, muted_user_id: mutedUserId, mute_invites: true },
    { onConflict: "user_id,muted_user_id" },
  );
  return { error: error?.message ?? null };
}

export async function isSubscribedToHostMeets(
  client: SupabaseClient,
  subscriberId: string,
  hostId: string,
) {
  const { data } = await client
    .from("ride_notification_subscriptions")
    .select("id")
    .eq("subscriber_id", subscriberId)
    .eq("host_id", hostId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleHostMeetSubscription(
  client: SupabaseClient,
  subscriberId: string,
  hostId: string,
) {
  const subscribed = await isSubscribedToHostMeets(client, subscriberId, hostId);
  if (subscribed) {
    const { error } = await client
      .from("ride_notification_subscriptions")
      .delete()
      .eq("subscriber_id", subscriberId)
      .eq("host_id", hostId);
    return { subscribed: false, error: error?.message ?? null };
  }

  const { error } = await client.from("ride_notification_subscriptions").insert({
    subscriber_id: subscriberId,
    host_id: hostId,
  });
  return { subscribed: true, error: error?.message ?? null };
}

export async function pinPostToProfile(
  client: SupabaseClient,
  userId: string,
  postId: string,
  pinned: boolean,
) {
  if (pinned) {
    await client
      .from("Posts")
      .update({ pinned_at: null })
      .eq("user_id", userId)
      .not("pinned_at", "is", null);
  }

  const { error } = await client
    .from("Posts")
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq("id", postId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

export function profileShareUrl(username: string | null | undefined, origin?: string) {
  const handle = username?.trim().replace(/^@+/, "");
  if (!handle) return null;
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/profile/${handle}`;
}

export function postShareUrl(postId: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/dashboard?post=${postId}`;
}

export async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("Clipboard unavailable.");
}

export async function shareUrl(title: string, url: string, text?: string) {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    await navigator.share({ title, text, url });
    return "shared";
  }
  await copyTextToClipboard(url);
  return "copied";
}
