"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: string;
  name: string;
  handle: string;
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
  text: string;
  senderId: string;
  senderName?: string;
  senderPhoto?: string | null;
  timeLabel: string;
  createdAt: string;
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
  created_at: string;
};

type Suggestion = {
  id: string;
  name: string;
  handle: string;
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

function directKeyFor(a: string, b: string) {
  return [a, b].sort().join(":");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapMessage(row: MessageRow, profilesById: Map<string, ProfileRow>): Message {
  const sender = profilesById.get(row.sender_id) ?? null;

  return {
    id: row.id,
    text: row.body || "",
    senderId: row.sender_id,
    senderName: profileName(sender),
    senderPhoto: profilePhoto(sender),
    timeLabel: messageTime(row.created_at),
    createdAt: row.created_at,
  };
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
      name: isGroup
        ? conversation.title || "Crimson Group"
        : profileName(otherProfile),
      handle: isGroup
        ? `${conversationMembers.length} riders`
        : profileHandle(otherProfile),
      photo: conversation.avatar_url || profilePhoto(otherProfile),
      lastMessage: latest?.body || "No messages yet.",
      timeLabel: timeLabel(latest?.created_at || conversation.updated_at),
      unread,
      isGroup,
      members: conversationMembers.length,
      online: false,
    };
  });
}

function MessagesAvatar({
  photo,
  name,
  online,
  isGroup,
  size = 48,
}: {
  photo: string | null;
  name: string;
  online?: boolean;
  isGroup?: boolean;
  size?: number;
}) {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#b4141e]"
      style={{ height: size, width: size }}
    >
      {photo ? (
        <Image
          src={photo}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized={photo.includes("supabase")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-serif italic text-white">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0c0c0d] bg-[#b4141e]" />
      )}
      {isGroup && (
        <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border border-[#0c0c0d] bg-[#b4141e] text-[8px] text-white">
          ◈
        </span>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [activeId, setActiveId] = useState<string | null>(params?.id ?? null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "groups">("all");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) || null;
  const activeThread = activeId ? threads[activeId] || [] : [];

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
          conversation.id === conversationId
            ? { ...conversation, unread: 0 }
            : conversation,
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

    const [conversationsResponse, allMembersResponse, messagesResponse] =
      await Promise.all([
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
          .select("id, conversation_id, sender_id, body, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true })
          .limit(300),
      ]);

    if (conversationsResponse.error || allMembersResponse.error || messagesResponse.error) {
      setConversations([]);
      setThreads({});
      setErrorMsg(
        conversationsResponse.error?.message ||
          allMembersResponse.error?.message ||
          messagesResponse.error?.message ||
          "Could not load messages.",
      );
      setLoadingMessages(false);
      return;
    }

    const conversationRows = (conversationsResponse.data || []) as ConversationRow[];
    const allMembers = (allMembersResponse.data || []) as unknown as MemberRow[];
    const messageRows = (messagesResponse.data || []) as unknown as MessageRow[];
    const profileIds = Array.from(
      new Set([
        ...allMembers.map((member) => member.user_id),
        ...messageRows.map((message) => message.sender_id),
      ]),
    );
    const profilesResponse = profileIds.length
      ? await supabase
          .from("profiles")
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
      conversationRows,
      allMembers,
      messageRows,
      userId,
      profilesById,
    ).sort((a, b) => {
      const aMessage = messageRows
        .filter((message) => message.conversation_id === a.id)
        .at(-1);
      const bMessage = messageRows
        .filter((message) => message.conversation_id === b.id)
        .at(-1);
      return (
        new Date(bMessage?.created_at || 0).getTime() -
        new Date(aMessage?.created_at || 0).getTime()
      );
    });
    const nextThreads = messageRows.reduce<Record<string, Message[]>>((acc, row) => {
      acc[row.conversation_id] = [...(acc[row.conversation_id] || []), mapMessage(row, profilesById)];
      return acc;
    }, {});

    setConversations(nextConversations);
    setThreads(nextThreads);
    setLoadingMessages(false);
  }, [userId]);

  const loadSuggestions = useCallback(async () => {
    if (!userId) return;

    const [profilesResponse, connectionsResponse, blocksResponse, meResponse] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, username, display_name, full_name, profile_image_url, avatar_url, city, state, riding_area, riding_style, bike_type, profile_tags, hide_location_from_suggestions, hide_from_suggestions, status"
          )
          .eq("status", "active")
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
        photo: profilePhoto(profile),
        reason: suggestionReason(profile, me),
      }))
      .slice(0, 4);

    setSuggestions(next);
  }, [userId]);

  const openDirectConversation = useCallback(
    async (peerId: string) => {
      if (!userId || !isUuid(peerId) || peerId === userId) return;

      const directKey = directKeyFor(userId, peerId);
      const existing = await supabase
        .from("conversations")
        .select("id")
        .eq("direct_key", directKey)
        .maybeSingle();

      let conversationId = existing.data?.id as string | undefined;

      if (!conversationId) {
        const created = await supabase
          .from("conversations")
          .insert({
            conversation_type: "direct",
            direct_key: directKey,
            created_by: userId,
          })
          .select("id")
          .single();

        if (created.error || !created.data) {
          setErrorMsg(created.error?.message || "Could not open conversation.");
          return;
        }

        conversationId = created.data.id as string;
        const membersResponse = await supabase.from("conversation_members").insert([
          { conversation_id: conversationId, user_id: userId, last_read_at: new Date().toISOString() },
          { conversation_id: conversationId, user_id: peerId },
        ]);

        if (membersResponse.error) {
          setErrorMsg(membersResponse.error.message);
          return;
        }
      }

      await loadConversations();
      setActiveId(conversationId);
      window.history.replaceState(null, "", `/messages/${conversationId}`);
    },
    [loadConversations, userId],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!session) router.replace("/login");
  }, [authLoading, router, session]);

  useEffect(() => {
    if (!userId) return;
    const timer = window.setTimeout(() => {
      void loadConversations();
      void loadSuggestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConversations, loadSuggestions, userId]);

  useEffect(() => {
    if (!params?.id || !userId) return;
    if (conversations.some((conversation) => conversation.id === params.id)) {
      const timer = window.setTimeout(() => setActiveId(params.id ?? null), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      void openDirectConversation(params.id ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [conversations, openDirectConversation, params?.id, userId]);

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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          void loadConversations();
        },
      )
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeId, threads]);

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

  const sendMessage = async () => {
    if (!draft.trim() || !activeId) return;

    const body = draft.trim();
    setDraft("");

    if (!userId || !isUuid(activeId)) {
      setErrorMsg("Could not send until a live conversation is selected.");
      setDraft(body);
      return;
    }

    const inserted = await supabase
      .from("messages")
      .insert({
        conversation_id: activeId,
        sender_id: userId,
        body,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (inserted.error || !inserted.data) {
      setErrorMsg(inserted.error?.message || "Message could not be sent.");
      setDraft(body);
      return;
    }

    const insertedRow = inserted.data as unknown as MessageRow;
    const senderProfileResponse = await supabase
      .from("profiles")
      .select("id, username, display_name, full_name, profile_image_url, avatar_url")
      .eq("id", insertedRow.sender_id)
      .maybeSingle();
    const newMessage = mapMessage(
      insertedRow,
      buildProfileMap(senderProfileResponse.data ? [senderProfileResponse.data as ProfileRow] : []),
    );
    setThreads((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), newMessage],
    }));
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              lastMessage: body,
              timeLabel: "Now",
            }
          : conversation,
      ),
    );
  };

  function closeConversation() {
    setActiveId(null);
    if (typeof window !== "undefined" && window.location.pathname !== "/messages") {
      window.history.replaceState(null, "", "/messages");
    }
  }

  if (authLoading || (!session && !authLoading)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050405] text-white">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Opening messages
        </p>
      </main>
    );
  }

  if (!session) return null;

  if (active) {
    return (
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#050405] text-zinc-100">
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

        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <button
              onClick={closeConversation}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="Back"
            >
              ‹
            </button>

            <MessagesAvatar
              photo={active.photo}
              name={active.name}
              online={active.online}
              size={40}
            />

            <div className="flex-1">
              <p className="text-sm text-white">{active.name}</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                {active.isGroup
                  ? `${active.members} riders`
                  : active.online
                    ? `Online · ${active.handle}`
                    : active.handle}
              </p>
            </div>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="Call"
            >
              ☎
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="Details"
            >
              ⋯
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <div className="mb-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/30">
              <div className="h-px w-8 bg-white/15" />
              <span>End-to-End · Riders Only</span>
              <div className="h-px w-8 bg-white/15" />
            </div>

            {activeThread.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-center">
                <p className="font-serif text-xl italic text-white">Start the line.</p>
                <p className="mt-2 text-xs uppercase tracking-[0.28em] text-white/35">
                  No messages yet
                </p>
              </div>
            )}

            {activeThread.map((m, i) => {
              const isMe = m.senderId === userId || m.senderId === "me";
              const prev = activeThread[i - 1];
              const showAvatar = !isMe && (!prev || prev.senderId !== m.senderId);

              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <div className="h-7 w-7 flex-shrink-0">
                      {showAvatar && (
                        <MessagesAvatar
                          photo={m.senderPhoto ?? null}
                          name={m.senderName || ""}
                          size={28}
                        />
                      )}
                    </div>
                  )}

                  <div
                    className={`flex max-w-[78%] flex-col ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    {active.isGroup && !isMe && showAvatar && m.senderName && (
                      <span className="mb-0.5 ml-3 text-[10px] uppercase tracking-[0.25em] text-[#e87a82]">
                        {m.senderName}
                      </span>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isMe
                          ? "rounded-br-md bg-gradient-to-br from-[#b4141e] to-[#8a0f17] text-white shadow-[0_0_18px_rgba(180,20,30,0.25)]"
                          : "rounded-bl-md border border-white/10 bg-gradient-to-b from-[#141416] to-[#0a0a0c] text-white/90"
                      }`}
                    >
                      {m.text}
                    </div>

                    <span className="mt-1 px-1 text-[10px] uppercase tracking-[0.25em] text-white/35">
                      {m.timeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="Add"
            >
              ＋
            </button>

            <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] px-4 py-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void sendMessage()}
                placeholder={`Message ${active.name.split(" ")[0]}...`}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              <button className="text-white/50 hover:text-[#e87a82]" aria-label="Photo">
                ◧
              </button>
            </div>

            <button
              onClick={() => void sendMessage()}
              disabled={!draft.trim()}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                draft.trim()
                  ? "bg-[#b4141e] text-white shadow-[0_0_20px_rgba(180,20,30,0.45)] hover:bg-[#d11827]"
                  : "border border-white/10 text-white/30"
              }`}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
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

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="w-[72px]" />
            <Link
              href="/connect"
              className="rounded-full bg-[#b4141e] px-4 py-2 text-xs uppercase tracking-[0.25em] text-white shadow-[0_0_20px_rgba(180,20,30,0.35)] hover:bg-[#d11827]"
            >
              + New
            </Link>
          </div>

          <div className="mt-10 text-center">
            <div className="mx-auto flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-white/20" />
              <span className="text-xl text-[#b4141e]">✦</span>
              <span className="h-px w-12 bg-white/20" />
            </div>

            <h1 className="mt-6 font-serif text-7xl leading-none text-white">
              Messages
            </h1>
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] px-4 py-2.5">
              <span className="text-white/40">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search riders, groups..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-1.5">
              {(["all", "unread", "groups"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-xl py-2 text-[11px] uppercase tracking-[0.3em] transition ${
                    tab === t
                      ? "bg-[#b4141e] text-white shadow-[0_0_18px_rgba(180,20,30,0.35)]"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="relative mx-auto mt-8 max-w-2xl px-5">
        {errorMsg && (
          <div className="mb-4 rounded-2xl border border-[#b4141e]/30 bg-[#b4141e]/10 p-4 text-sm text-[#f1c3c7]">
            {errorMsg}
          </div>
        )}

        {suggestions.length > 0 && (
          <section className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#e87a82]">
                People You May Know
              </p>
              <Link
                href="/connect"
                className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 transition hover:text-zinc-300"
              >
                Connect
              </Link>
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <Link
                  key={suggestion.id}
                  href={`/connect`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-[#b4141e]/40"
                >
                  <MessagesAvatar
                    photo={suggestion.photo}
                    name={suggestion.name}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{suggestion.name}</p>
                    <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      {suggestion.handle} · {suggestion.reason}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
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
            <p className="font-serif text-2xl italic text-white">Silence on the line.</p>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
              No conversations match
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveId(c.id);
                  if (isUuid(c.id)) {
                    window.history.replaceState(null, "", `/messages/${c.id}`);
                  }
                }}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4 text-left transition hover:border-[#b4141e]/40 hover:shadow-[0_0_25px_rgba(180,20,30,0.15)]"
              >
                <MessagesAvatar
                  photo={c.photo}
                  name={c.name}
                  online={c.online}
                  isGroup={c.isGroup}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-white">{c.name}</p>
                    <span className="flex-shrink-0 text-[10px] uppercase tracking-[0.25em] text-white/40">
                      {c.timeLabel}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-xs ${
                        c.unread > 0 ? "text-white/90" : "text-white/45"
                      }`}
                    >
                      {c.lastMessage}
                    </p>

                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#b4141e] px-1.5 text-[10px] font-medium text-white shadow-[0_0_12px_rgba(180,20,30,0.5)]">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-center gap-3 text-white/30">
          <div className="h-px w-12 bg-white/15" />
          <span className="text-xs">✦</span>
          <div className="h-px w-12 bg-white/15" />
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] text-white/30">
          © Crimson Society · MMXXVI
        </p>
      </div>
    </main>
  );
}
