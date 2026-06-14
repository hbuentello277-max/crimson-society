import type { SupabaseClient } from "@supabase/supabase-js";
import { sosTypeLabel } from "@/lib/rider-sos/sos-types";
import { formatRiderIdentity } from "@/lib/rider-identity";

export type DirectConversationPreview = {
  id: string;
  name: string;
  handle: string;
  profileHref: string | null;
  photo: string | null;
  lastMessage: string;
  timeLabel: string;
  unread: number;
  isGroup: boolean;
  isSos?: boolean;
  conversationStatus?: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
};

function profileName(profile: ProfileRow | null | undefined) {
  return formatRiderIdentity(profile, { fallback: "Crimson Rider" });
}

function profileHandle(profile: ProfileRow | null | undefined) {
  return formatRiderIdentity(profile, { fallback: "@member" });
}

function profilePhoto(profile: ProfileRow | null | undefined) {
  return profile?.profile_image_url || profile?.avatar_url || null;
}

function publicProfileHref(profile: ProfileRow | null | undefined) {
  const username = profile?.username?.trim().replace(/^@+/, "");
  return username ? `/profile/${username}` : null;
}

export async function fetchDirectConversationPreview(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  peerIdHint?: string,
): Promise<DirectConversationPreview | null> {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, conversation_type, title, conversation_status, sos_type, sos_owner_name, sos_active_responder_count, updated_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    return null;
  }

  const { data: members, error: membersError } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  if (membersError) {
    return null;
  }

  const memberIds = (members || []).map((row) => row.user_id as string);
  const isSos = conversation.conversation_type === "sos";
  const isGroup = conversation.conversation_type === "group" || isSos;

  if (isSos) {
    return {
      id: conversationId,
      name: conversation.title?.trim() || "🚨 SOS Assistance Chat",
      handle: [
        conversation.sos_type ? sosTypeLabel(String(conversation.sos_type)) : null,
        conversation.sos_owner_name as string | null | undefined,
        `${Number(conversation.sos_active_responder_count ?? 0)} Responders Active`,
      ]
        .filter(Boolean)
        .join(" · "),
      profileHref: null,
      photo: null,
      lastMessage: "No messages yet",
      timeLabel: "Now",
      unread: 0,
      isGroup: true,
      isSos: true,
      conversationStatus: conversation.conversation_status ?? "active",
    };
  }

  const otherUserId =
    peerIdHint && memberIds.includes(peerIdHint)
      ? peerIdHint
      : memberIds.find((id) => id !== userId) ?? peerIdHint;

  if (!otherUserId) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select("id, username, display_name, full_name, profile_image_url, avatar_url")
    .eq("id", otherUserId)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  const profileRow = profile as ProfileRow;

  return {
    id: conversationId,
    name: isSos
      ? conversation.title?.trim() || "🚨 SOS Assistance Chat"
      : isGroup
        ? conversation.title?.trim() || "Group ride"
      : profileName(profileRow),
    handle: isSos ? "SOS Assistance" : isGroup ? "Group" : profileHandle(profileRow),
    profileHref: isGroup ? null : publicProfileHref(profileRow),
    photo: profilePhoto(profileRow),
    lastMessage: "No messages yet",
    timeLabel: "Now",
    unread: 0,
    isGroup,
    isSos,
    conversationStatus: conversation.conversation_status ?? "active",
  };
}
