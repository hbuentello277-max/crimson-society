"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { MessageThreadScreen } from "@/components/inbox/MessageThreadScreen";
import { MessagesAvatar } from "@/components/inbox/MessagesAvatar";
import { NewMessageSheet } from "@/components/inbox/NewMessageSheet";
import { ReportContentModal } from "@/components/safety/ReportContentModal";
import { fetchDirectConversationPreview } from "@/lib/messages/conversation-preview";
import {
  isUuid,
  openDirectConversationWithPeer,
} from "@/lib/messages/direct-conversation";
import { ensureUserProfile } from "@/lib/profile";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import { supabase } from "@/lib/supabase";
import {
  dmMessagePreview,
  normalizeDmMessageType,
  type DmMessageType,
  validateDmAudioFile,
  validateDmImageFile,
} from "@/lib/messages/dm-message";
import { DM_VOICE_MAX_SECONDS, DM_VOICE_MIN_SECONDS } from "@/lib/messages/voice-recorder";
import { CS_BADGE_SM, CS_FOCUS_RING, csPill } from "@/lib/crimson-accent";
import { DEFAULT_REPORT_REASONS, submitUserReport } from "@/lib/user-reports";

const DM_MESSAGE_SELECT =
  "id, conversation_id, sender_id, body, message_type, media_url, media_path, media_mime_type, media_size_bytes, media_duration_seconds, created_at";

type Conversation = {
  id: string;
  name: string;
  handle: string;
  profileHref?: string | null;
  photo: string | null;
  lastMessage: string;
  timeLabel: string;
  unread: number;
  isGroup?: boolean;
  members?: number;
  online?: boolean;
};

type Message = {
  id: string;
  messageType: DmMessageType;
  text: string;
  senderId: string;
  senderName?: string;
  senderPhoto?: string | null;
  timeLabel: string;
  createdAt: string;
  mediaUrl?: string | null;
  mediaPath?: string | null;
  mediaMimeType?: string | null;
  mediaDurationSeconds?: number | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
  city?: string | null;
  state?: string | null;
  riding_area?: string | null;
  riding_style?: string | null;
  bike_type?: string | null;
  profile_tags?: string[] | null;
  hide_location_from_suggestions?: boolean | null;
};

type ConversationRow = {
  id: string;
  conversation_type: string | null;
  title: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type?: string | null;
  media_url?: string | null;
  media_path?: string | null;
  media_mime_type?: string | null;
  media_size_bytes?: number | null;
  media_duration_seconds?: number | null;
  created_at: string;
};

type Suggestion = {
  id: string;
  name: string;
  handle: string;
  profileHref: string | null;
  photo: string | null;
  reason: string;
};

type ConnectionRow = {
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
};

type BlockRow = {
  blocker_id: string;
  blocked_id: string;
};

function buildProfileMap(profiles: ProfileRow[]) {
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

function profileName(profile: ProfileRow | null | undefined) {
  return profile?.display_name || profile?.full_name || profile?.username || "Crimson Rider";
}

function profileHandle(profile: ProfileRow | null | undefined) {
  return profile?.username ? `@${profile.username}` : "@member";
}

function profilePhoto(profile: ProfileRow | null | undefined) {
  return profile?.profile_image_url || profile?.avatar_url || null;
}

function publicProfileHref(profile: ProfileRow | null | undefined) {
  const username = profile?.username?.trim().replace(/^@+/, "");
  return username ? `/profile/${username}` : null;
}

function suggestionReason(profile: ProfileRow, me: ProfileRow | null) {
  if (me?.city && profile.city && me.city.toLowerCase() === profile.city.toLowerCase()) {
    return "Same city scene";
  }

  if (me?.state && profile.state && me.state.toLowerCase() === profile.state.toLowerCase()) {
    return "Same state scene";
  }

  if (me?.riding_style && profile.riding_style && me.riding_style === profile.riding_style) {
    return "Similar riding style";
  }

  if (me?.bike_type && profile.bike_type && me.bike_type === profile.bike_type) {
    return "Similar machine";
  }

  return profile.riding_area ? "Shared riding scene" : "Crimson Society rider";
}

function timeLabel(value?: string | null) {
  if (!value) return "";

  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));

  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;

  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;

  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapMessage(row: MessageRow, profilesById: Map<string, ProfileRow>): Message {
  const sender = profilesById.get(row.sender_id) ?? null;

  return {
    id: row.id,
    messageType: normalizeDmMessageType(row.message_type),
    text: row.body || "",
    senderId: row.sender_id,
    senderName: profileName(sender),
    senderPhoto: profilePhoto(sender),
    timeLabel: messageTime(row.created_at),
    createdAt: row.created_at,
    mediaUrl: row.media_url,
    mediaPath: row.media_path,
    mediaMimeType: row.media_mime_type,
    mediaDurationSeconds: row.media_duration_seconds,
  };
}

async function signMessageMediaRows(rows: MessageRow[]) {
  const rowsNeedingSignedUrls = rows.filter((row) => row.media_path);
  if (rowsNeedingSignedUrls.length === 0) return rows;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const signedEntries = await Promise.all(
    rowsNeedingSignedUrls.map(async (row) => {
      const params = new URLSearchParams({
        conversationId: row.conversation_id,
        path: row.media_path || "",
      });

      try {
        const response = await fetch(`/api/messages/media?${params.toString()}`, { headers });
        const payload = (await response.json()) as { ok?: boolean; mediaUrl?: string };
        return [row.id, response.ok && payload.ok ? payload.mediaUrl ?? null : null] as const;
      } catch {
        return [row.id, null] as const;
      }
    }),
  );

  const signedUrlById = new Map(signedEntries);
  return rows.map((row) =>
    row.media_path && signedUrlById.has(row.id)
      ? { ...row, media_url: signedUrlById.get(row.id) ?? row.media_url }
      : row,
  );
}

function conversationHasMessages(conversationId: string, messages: MessageRow[]) {
  return messages.some((message) => message.conversation_id === conversationId);
}

function buildConversations(
  rows: ConversationRow[],
  members: MemberRow[],
  messages: MessageRow[],
  userId: string,
  profilesById: Map<string, ProfileRow>,
) {
  return rows.map((conversation) => {
    const conversationMembers = members.filter(
      (member) => member.conversation_id === conversation.id,
    );
    const myMembership = conversationMembers.find((member) => member.user_id === userId);
    const otherMembers = conversationMembers.filter((member) => member.user_id !== userId);
    const otherProfile = profilesById.get(otherMembers[0]?.user_id ?? "") ?? null;
    const latest = messages
      .filter((message) => message.conversation_id === conversation.id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];

    const lastReadAt = myMembership?.last_read_at
      ? new Date(myMembership.last_read_at).getTime()
      : 0;

    const unread = messages.filter(
      (message) =>
        message.conversation_id === conversation.id &&
        message.sender_id !== userId &&
        new Date(message.created_at).getTime() > lastReadAt,
    ).length;

    const isGroup = conversation.conversation_type === "group";

    return {
      id: conversation.id,
      name: isGroup ? conversation.title || "Crimson Group" : profileName(otherProfile),
      handle: isGroup ? `${conversationMembers.length} riders` : profileHandle(otherProfile),
      profileHref: isGroup ? null : publicProfileHref(otherProfile),
      photo: conversation.avatar_url || profilePhoto(otherProfile),
      lastMessage: latest ? dmMessagePreview(latest) : "No messages yet.",
      timeLabel: timeLabel(latest?.created_at || conversation.updated_at),
      unread,
      isGroup,
      members: conversationMembers.length,
      online: false,
    };
  });
}

type MessagesPanelProps = {
  embedded?: boolean;
  newMessageRequestId?: number;
  onThreadActiveChange?: (active: boolean) => void;
};

export default function MessagesPanel({
  embedded = false,
  newMessageRequestId = 0,
  onThreadActiveChange,
}: MessagesPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation");
  const peerParam = searchParams.get("peer");
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [activeId, setActiveId] = useState<string | null>(conversationParam);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "groups">("all");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [threadFocusConversation, setThreadFocusConversation] = useState<Conversation | null>(
    null,
  );
  const [focusComposerOnOpen, setFocusComposerOnOpen] = useState(false);
  const [reportMessageTarget, setReportMessageTarget] = useState<{
    messageId: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    preview: string;
  } | null>(null);
  const [reportMessageBusy, setReportMessageBusy] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUploadKind, setMediaUploadKind] = useState<"image" | "audio" | null>(null);

  const active =
    (activeId && conversations.find((c) => c.id === activeId)) ||
    (activeId && threadFocusConversation?.id === activeId ? threadFocusConversation : null) ||
    null;
  const activeThread = activeId ? threads[activeId] || [] : [];

  const filtered = useMemo(
    () =>
      conversations.filter((c) => {
        const q = search.toLowerCase();
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q);

        if (!matchesSearch) return false;
        if (tab === "unread") return c.unread > 0;
        if (tab === "groups") return !!c.isGroup;
        return true;
      }),
    [conversations, search, tab],
  );

  const filteredSuggestions = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();

    return suggestions.filter((member) => {
      if (!q) return true;

      return (
        member.name.toLowerCase().includes(q) ||
        member.handle.toLowerCase().includes(q) ||
        member.reason.toLowerCase().includes(q)
      );
    });
  }, [memberSearch, suggestions]);

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      if (!userId) return;

      await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation,
        ),
      );
    },
    [userId],
  );

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    setLoadingMessages(true);
    setErrorMsg("");

    const membershipsResponse = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id, last_read_at")
      .eq("user_id", userId);

    if (membershipsResponse.error) {
      setConversations([]);
      setThreads({});
      setErrorMsg(membershipsResponse.error.message);
      setLoadingMessages(false);
      return;
    }

    const ownMemberships = (membershipsResponse.data || []) as unknown as MemberRow[];
    const conversationIds = ownMemberships.map((member) => member.conversation_id);

    if (conversationIds.length === 0) {
      setConversations([]);
      setThreads({});
      setLoadingMessages(false);
      return;
    }

    const [conversationsResponse, allMembersResponse, messagesResponse, blocksResponse] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, conversation_type, title, avatar_url, created_at, updated_at")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false }),
      supabase
        .from("conversation_members")
        .select("conversation_id, user_id, last_read_at")
        .in("conversation_id", conversationIds),
      supabase
        .from("messages")
        .select(DM_MESSAGE_SELECT)
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })
        .limit(300),
      supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    ]);

    if (conversationsResponse.error || allMembersResponse.error || messagesResponse.error || blocksResponse.error) {
      setConversations([]);
      setThreads({});
      setErrorMsg(
        conversationsResponse.error?.message ||
          allMembersResponse.error?.message ||
          messagesResponse.error?.message ||
          blocksResponse.error?.message ||
          "Could not load messages.",
      );
      setLoadingMessages(false);
      return;
    }

    const conversationRows = (conversationsResponse.data || []) as ConversationRow[];
    const allMembers = (allMembersResponse.data || []) as unknown as MemberRow[];
    const messageRows = (messagesResponse.data || []) as unknown as MessageRow[];
    const blocks = ((blocksResponse.data || []) as BlockRow[]) || [];
    const blockedIds = new Set(
      blocks.map((block) => (block.blocker_id === userId ? block.blocked_id : block.blocker_id)),
    );
    const visibleConversationIds = new Set(
      conversationRows
        .filter((conversation) => {
          if (conversation.conversation_type !== "direct") return true;
          return !allMembers.some(
            (member) => member.conversation_id === conversation.id && blockedIds.has(member.user_id),
          );
        })
        .map((conversation) => conversation.id),
    );
    const visibleConversationRows = conversationRows.filter((conversation) =>
      visibleConversationIds.has(conversation.id),
    );
    const visibleMembers = allMembers.filter((member) =>
      visibleConversationIds.has(member.conversation_id),
    );
    const signedMessageRows = await signMessageMediaRows(messageRows);
    const visibleMessages = signedMessageRows.filter((message) =>
      visibleConversationIds.has(message.conversation_id),
    );
    const profileIds = Array.from(
      new Set([
        ...visibleMembers.map((member) => member.user_id),
        ...visibleMessages.map((message) => message.sender_id),
      ]),
    );

    const profilesResponse = profileIds.length
      ? await supabase
          .from("public_profiles")
          .select("id, username, display_name, full_name, profile_image_url, avatar_url")
          .in("id", profileIds)
      : { data: [], error: null };

    if (profilesResponse.error) {
      setConversations([]);
      setThreads({});
      setErrorMsg(profilesResponse.error.message);
      setLoadingMessages(false);
      return;
    }

    const profilesById = buildProfileMap((profilesResponse.data || []) as ProfileRow[]);
    const nextConversations = buildConversations(
      visibleConversationRows,
      visibleMembers,
      visibleMessages,
      userId,
      profilesById,
    )
      .filter((conversation) => conversationHasMessages(conversation.id, visibleMessages))
      .sort((a, b) => {
      const aMessage = visibleMessages.filter((message) => message.conversation_id === a.id).at(-1);
      const bMessage = visibleMessages.filter((message) => message.conversation_id === b.id).at(-1);

      return (
        new Date(bMessage?.created_at || 0).getTime() -
        new Date(aMessage?.created_at || 0).getTime()
      );
    });

    const nextThreads = visibleMessages.reduce<Record<string, Message[]>>((acc, row) => {
      acc[row.conversation_id] = [
        ...(acc[row.conversation_id] || []),
        mapMessage(row, profilesById),
      ];
      return acc;
    }, {});

    setConversations(nextConversations);
    setThreads(nextThreads);
    setLoadingMessages(false);
  }, [userId]);

  const loadSuggestions = useCallback(async () => {
    if (!userId) return;

    const [profilesResponse, connectionsResponse, blocksResponse, meResponse] = await Promise.all([
      supabase
        .from("public_profiles")
        .select(
          "id, username, display_name, full_name, profile_image_url, avatar_url, city, state, riding_area, riding_style, bike_type, profile_tags, hide_location_from_suggestions, hide_from_suggestions",
        )
        .eq("hide_from_suggestions", false)
        .neq("id", userId)
        .limit(24),
      supabase
        .from("user_connections")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
      supabase
        .from("profiles")
        .select("id, city, state, riding_area, riding_style, bike_type, profile_tags")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    if (profilesResponse.error || connectionsResponse.error || blocksResponse.error) {
      setSuggestions([]);
      return;
    }

    const connections = ((connectionsResponse.data || []) as ConnectionRow[]) || [];
    const blocks = ((blocksResponse.data || []) as BlockRow[]) || [];

    const blockedIds = new Set(
      blocks.map((block) => (block.blocker_id === userId ? block.blocked_id : block.blocker_id)),
    );

    const connectedOrPendingIds = new Set(
      connections.map((connection) =>
        connection.requester_id === userId ? connection.addressee_id : connection.requester_id,
      ),
    );

    const me = (meResponse.data as ProfileRow | null) ?? null;

    const next = ((profilesResponse.data || []) as unknown as ProfileRow[])
      .filter((profile) => !blockedIds.has(profile.id))
      .filter((profile) => !connectedOrPendingIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        name: profileName(profile),
        handle: profileHandle(profile),
        profileHref: publicProfileHref(profile),
        photo: profilePhoto(profile),
        reason: suggestionReason(profile, me),
      }));

    setSuggestions(next);
  }, [userId]);

  const enterConversationThread = useCallback(
    async (conversationId: string, peerId?: string) => {
      if (!userId) return;

      const preview = await fetchDirectConversationPreview(
        supabase,
        conversationId,
        userId,
        peerId,
      );

      if (!preview) {
        setErrorMsg("Could not open conversation.");
        return;
      }

      setThreadFocusConversation(preview);
      setActiveId(conversationId);
      setThreads((prev) => ({
        ...prev,
        [conversationId]: prev[conversationId] ?? [],
      }));
      setFocusComposerOnOpen(true);
      setShowNewMessage(false);
      setMemberSearch("");
      window.history.replaceState(null, "", `/inbox?conversation=${conversationId}`);
      void loadConversations();
    },
    [loadConversations, userId],
  );

  const openDirectConversation = useCallback(
    async (peerId: string) => {
      if (!userId) return;

      setErrorMsg("");

      if (session?.user) {
        await ensureUserProfile(session.user).catch(() => null);
      }

      const result = await openDirectConversationWithPeer(supabase, userId, peerId);

      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }

      await enterConversationThread(result.conversationId, peerId);
    },
    [enterConversationThread, session?.user, userId],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!session?.user?.id) {
      router.replace("/login");
      return;
    }

    let mounted = true;

    const checkProfileSetup = async () => {
      try {
        const complete = await requireCompleteProfile(session.user.id);

        if (mounted && !complete) {
          router.replace("/profile/setup");
        }
      } catch {
        if (mounted) {
          router.replace("/profile/setup");
        }
      }
    };

    void checkProfileSetup();

    return () => {
      mounted = false;
    };
  }, [authLoading, session, router]);

  useEffect(() => {
    if (!userId) return;

    const timer = window.setTimeout(() => {
      void loadConversations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadConversations, userId]);

  useEffect(() => {
    if (!newMessageRequestId) return;
    setShowNewMessage(true);
  }, [newMessageRequestId]);

  useEffect(() => {
    if (!showNewMessage || !userId) return;

    const timer = window.setTimeout(() => {
      void loadSuggestions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSuggestions, showNewMessage, userId]);

  useEffect(() => {
    if (!peerParam || !userId || !isUuid(peerParam)) return;
    if (activeId) return;

    const timer = window.setTimeout(() => {
      void openDirectConversation(peerParam);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeId, openDirectConversation, peerParam, userId]);

  useEffect(() => {
    if (!conversationParam || !userId || !isUuid(conversationParam) || peerParam) return;
    if (activeId === conversationParam) return;

    const timer = window.setTimeout(() => {
      void enterConversationThread(conversationParam);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeId, conversationParam, enterConversationThread, peerParam, userId]);

  useEffect(() => {
    if (!activeId) return;

    const timer = window.setTimeout(() => {
      void markConversationRead(activeId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeId, markConversationRead]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`messages-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void loadConversations();
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members" },
        () => {
          void loadConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, userId]);

  useEffect(() => {
    onThreadActiveChange?.(Boolean(active));
  }, [active, onThreadActiveChange]);

  const appendLocalMessage = useCallback(
    (row: MessageRow) => {
      if (!activeId) return;

      const senderProfileResponsePromise = supabase
        .from("public_profiles")
        .select("id, username, display_name, full_name, profile_image_url, avatar_url")
        .eq("id", row.sender_id)
        .maybeSingle();

      void senderProfileResponsePromise.then((senderProfileResponse) => {
        const newMessage = mapMessage(
          row,
          buildProfileMap(
            senderProfileResponse.data ? [senderProfileResponse.data as ProfileRow] : [],
          ),
        );

        setThreads((prev) => ({
          ...prev,
          [activeId]: [...(prev[activeId] || []), newMessage],
        }));

        setConversations((prev) => {
          const exists = prev.some((conversation) => conversation.id === activeId);
          if (!exists) {
            void loadConversations();
            return prev;
          }

          return prev.map((conversation) =>
            conversation.id === activeId
              ? {
                  ...conversation,
                  lastMessage: dmMessagePreview(row),
                  timeLabel: "Now",
                  unread: 0,
                }
              : conversation,
          );
        });
      });
    },
    [activeId, loadConversations],
  );

  const sendMessage = async () => {
    if (!draft.trim() || !activeId || sendingMessage || uploadingMedia) return;

    const body = draft.trim();
    setDraft("");

    if (!userId || !isUuid(activeId)) {
      setErrorMsg("Could not send until a live conversation is selected.");
      setDraft(body);
      return;
    }

    setSendingMessage(true);

    const inserted = await supabase
      .from("messages")
      .insert({
        conversation_id: activeId,
        sender_id: userId,
        message_type: "text",
        body,
      })
      .select(DM_MESSAGE_SELECT)
      .single();

    setSendingMessage(false);

    if (inserted.error || !inserted.data) {
      setErrorMsg(inserted.error?.message || "Message could not be sent.");
      setDraft(body);
      return;
    }

    appendLocalMessage(inserted.data as unknown as MessageRow);
  };

  const sendImageMessage = async (file: File) => {
    if (!activeId || !userId || sendingMessage || uploadingMedia) return;

    const validationError = validateDmImageFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setUploadingMedia(true);
    setMediaUploadKind("image");
    setErrorMsg("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const formData = new FormData();
      formData.append("conversationId", activeId);
      formData.append("file", file);

      const uploadResponse = await fetch("/api/messages/media", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const uploadResult = (await uploadResponse.json()) as {
        ok?: boolean;
        error?: string;
        messageId?: string;
        mediaUrl?: string;
        mediaPath?: string;
        mediaMimeType?: string;
        mediaSizeBytes?: number;
      };

      if (!uploadResponse.ok || !uploadResult.ok || !uploadResult.messageId) {
        throw new Error(uploadResult.error || "Image upload failed.");
      }

      const inserted = await supabase
        .from("messages")
        .insert({
          id: uploadResult.messageId,
          conversation_id: activeId,
          sender_id: userId,
          message_type: "image",
          body: "",
          media_url: null,
          media_path: uploadResult.mediaPath,
          media_mime_type: uploadResult.mediaMimeType,
          media_size_bytes: uploadResult.mediaSizeBytes,
        })
        .select(DM_MESSAGE_SELECT)
        .single();

      if (inserted.error || !inserted.data) {
        throw new Error(inserted.error?.message || "Image message could not be saved.");
      }

      appendLocalMessage({
        ...(inserted.data as unknown as MessageRow),
        media_url: uploadResult.mediaUrl ?? null,
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not send image.");
    } finally {
      setUploadingMedia(false);
      setMediaUploadKind(null);
    }
  };

  const sendAudioMessage = async (file: File, durationSeconds: number) => {
    if (!activeId || !userId || sendingMessage || uploadingMedia) return;

    const validationError = validateDmAudioFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const clampedDuration = Math.min(
      DM_VOICE_MAX_SECONDS,
      Math.max(DM_VOICE_MIN_SECONDS, Math.round(durationSeconds)),
    );

    setUploadingMedia(true);
    setMediaUploadKind("audio");
    setErrorMsg("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const formData = new FormData();
      formData.append("conversationId", activeId);
      formData.append("file", file);
      formData.append("durationSeconds", String(clampedDuration));

      const uploadResponse = await fetch("/api/messages/media", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const uploadResult = (await uploadResponse.json()) as {
        ok?: boolean;
        error?: string;
        messageId?: string;
        mediaUrl?: string;
        mediaPath?: string;
        mediaMimeType?: string;
        mediaSizeBytes?: number;
        mediaDurationSeconds?: number | null;
        messageType?: string;
      };

      if (!uploadResponse.ok || !uploadResult.ok || !uploadResult.messageId) {
        throw new Error(uploadResult.error || "Voice message upload failed.");
      }

      const inserted = await supabase
        .from("messages")
        .insert({
          id: uploadResult.messageId,
          conversation_id: activeId,
          sender_id: userId,
          message_type: "audio",
          body: "",
          media_url: null,
          media_path: uploadResult.mediaPath,
          media_mime_type: uploadResult.mediaMimeType,
          media_size_bytes: uploadResult.mediaSizeBytes,
          media_duration_seconds:
            uploadResult.mediaDurationSeconds ?? clampedDuration,
        })
        .select(DM_MESSAGE_SELECT)
        .single();

      if (inserted.error || !inserted.data) {
        throw new Error(inserted.error?.message || "Voice message could not be saved.");
      }

      appendLocalMessage({
        ...(inserted.data as unknown as MessageRow),
        media_url: uploadResult.mediaUrl ?? null,
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not send voice message.");
    } finally {
      setUploadingMedia(false);
      setMediaUploadKind(null);
    }
  };

  function closeConversation() {
    setActiveId(null);
    setThreadFocusConversation(null);
    setFocusComposerOnOpen(false);

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/inbox");
    }
  }

  const closeNewMessageSheet = useCallback(() => {
    setShowNewMessage(false);
    setMemberSearch("");
  }, []);

  if (authLoading || (!session && !authLoading)) {
    if (embedded) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center bg-black text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Opening messages</p>
        </div>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050405] text-white">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Opening messages
        </p>
      </main>
    );
  }

  if (!session) return null;

  const listShellClass = embedded
    ? "relative flex h-full min-h-0 flex-col overflow-hidden bg-black"
    : "relative min-h-screen overflow-hidden bg-[#050405]";

  return (
    <>
      {active && (
        <MessageThreadScreen
          open
          conversation={active}
          messages={activeThread}
          draft={draft}
          userId={userId}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
          onImageSelected={(file) => void sendImageMessage(file)}
          onAudioRecorded={(file, duration) => void sendAudioMessage(file, duration)}
          onBack={closeConversation}
          onReportMessage={(message) =>
            setReportMessageTarget({
              messageId: message.id,
              conversationId: active.id,
              senderId: message.senderId,
              senderName: message.senderName || active.name,
              preview:
                message.messageType === "image"
                  ? "[Photo]"
                  : message.messageType === "audio"
                    ? "[Voice message]"
                    : message.text,
            })
          }
          focusComposer={focusComposerOnOpen}
          sending={sendingMessage}
          uploadingMedia={uploadingMedia}
          mediaUploadKind={mediaUploadKind}
        />
      )}

      <main className={`${listShellClass} text-zinc-100 ${active ? "hidden" : ""}`}>
        {!embedded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
                radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%),
                linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)
              `,
            }}
          />
        )}

        {!embedded && (
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
            <div className="mx-auto max-w-2xl px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
              <div className="mt-10 text-center">
                <div className="mx-auto flex items-center justify-center gap-4">
                  <span className="h-px w-12 bg-white/20" />
                  <span className="text-xl text-[#b4141e]">✦</span>
                  <span className="h-px w-12 bg-white/20" />
                </div>
                <h1 className="mt-6 font-serif text-7xl leading-none text-white">Messages</h1>
              </div>
              <div className="mt-10">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-2.5">
                  <span className="text-white/40">⌕</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search riders, groups..."
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  {(["all", "unread", "groups"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`flex-1 ${csPill(tab === t)} py-2 text-[11px] tracking-[0.22em]`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>
        )}

        {embedded && (
          <div className="shrink-0 border-b border-white/10 bg-black px-3 pb-3 pt-2">
            <div className={`flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-2.5 ${CS_FOCUS_RING}`}>
              <span className="text-white/40">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search riders, groups..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>
            <div className="mt-2.5 flex gap-1.5">
              {(["all", "unread", "groups"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 ${csPill(tab === t, "sm")} py-1.5 text-[10px] tracking-[0.18em]`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className={`relative flex-1 ${
            embedded
              ? "min-h-0 overflow-y-auto overscroll-contain"
              : "mx-auto mt-8 max-w-2xl px-5"
          }`}
        >
          {errorMsg && (
            <div className="mb-4 rounded-2xl border border-[#b4141e]/30 bg-[#b4141e]/10 p-4 text-sm text-[#f1c3c7]">
              {errorMsg}
            </div>
          )}

          {loadingMessages ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-10 text-center">
              {conversations.length === 0 ? (
                <>
                  <p className="font-serif text-2xl italic text-white">No messages yet.</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Start a conversation from a rider profile or the Riders page.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-serif text-2xl italic text-white">Silence on the line.</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
                    No conversations match
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className={embedded ? "divide-y divide-white/10" : "space-y-2"}>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    void enterConversationThread(c.id);
                  }}
                  className={
                    embedded
                      ? "flex w-full items-center gap-3 px-3 py-3.5 text-left transition active:bg-white/[0.04]"
                      : "group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4 text-left transition hover:border-[#b4141e]/40"
                  }
                >
                  {embedded && c.unread > 0 && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full border border-[#b4141e] bg-[#b4141e]/20"
                      aria-hidden
                    />
                  )}
                  {embedded && c.unread === 0 && <span className="w-2 shrink-0" aria-hidden />}

                  <MessagesAvatar
                    photo={c.photo}
                    name={c.name}
                    online={c.online}
                    isGroup={c.isGroup}
                    size={embedded ? 56 : 48}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`truncate text-[15px] ${c.unread > 0 ? "font-semibold text-white" : "font-medium text-white"}`}
                      >
                        {c.name}
                      </p>
                      <span className="shrink-0 text-xs text-zinc-500">{c.timeLabel}</span>
                    </div>

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${c.unread > 0 ? "text-zinc-300" : "text-zinc-500"}`}
                      >
                        {c.lastMessage}
                      </p>

                      {c.unread > 0 && (
                        <span className={CS_BADGE_SM}>
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!embedded && (
            <>
              <div className="mt-10 flex items-center justify-center gap-3 text-white/30">
                <div className="h-px w-12 bg-white/15" />
                <span className="text-xs">✦</span>
                <div className="h-px w-12 bg-white/15" />
              </div>
              <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] text-white/30">
                © Crimson Society · MMXXVI
              </p>
            </>
          )}
        </div>
      </main>

      <NewMessageSheet
        open={showNewMessage && !active}
        memberSearch={memberSearch}
        suggestions={filteredSuggestions}
        onMemberSearchChange={setMemberSearch}
        onSelect={(peerId) => void openDirectConversation(peerId)}
        onClose={closeNewMessageSheet}
      />

      <ReportContentModal
        open={Boolean(reportMessageTarget)}
        title="Report Message"
        subtitle={
          reportMessageTarget
            ? `Report a message from ${reportMessageTarget.senderName}.`
            : undefined
        }
        reasons={DEFAULT_REPORT_REASONS}
        busy={reportMessageBusy}
        onClose={() => {
          if (!reportMessageBusy) setReportMessageTarget(null);
        }}
        onSubmit={async ({ reason, details }) => {
          if (!userId || !reportMessageTarget) return;
          setReportMessageBusy(true);
          const { error } = await submitUserReport({
            reporterId: userId,
            reason,
            details,
            messageId: reportMessageTarget.messageId,
            conversationId: reportMessageTarget.conversationId,
            reportedUserId: reportMessageTarget.senderId,
          });
          setReportMessageBusy(false);
          if (error) {
            setErrorMsg(error.message);
            return;
          }
          setReportMessageTarget(null);
          setErrorMsg("Message report submitted.");
          window.setTimeout(() => setErrorMsg(""), 2600);
        }}
      />
    </>
  );
}
