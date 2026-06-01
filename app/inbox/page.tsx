"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MessagesPanel from "@/components/inbox/MessagesPanel";
import NotificationsPanel from "@/components/inbox/NotificationsPanel";
import { supabase } from "@/lib/supabase";

type ConversationMemberBadgeRow = {
  conversation_id: string;
  last_read_at: string | null;
};

type MessageBadgeRow = {
  conversation_id: string;
  sender_id: string;
  created_at: string;
};

function badgeLabel(count: number) {
  return count > 9 ? "9+" : String(count);
}

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[#120608] bg-[#7f111b] px-1 text-[9px] font-semibold leading-none text-[#f4dadd] shadow-[0_0_12px_rgba(127,17,27,0.55)]">
      {badgeLabel(count)}
    </span>
  );
}

function InboxTabs() {
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const activeTab = searchParams.get("tab") === "notifications" ? "notifications" : "messages";

  const loadNotificationUnreadCount = useCallback(async () => {
    const userId = session?.user?.id;

    if (!userId) {
      setNotificationUnreadCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("Failed to load inbox notification unread count:", error);
      return;
    }

    setNotificationUnreadCount(count || 0);
  }, [session?.user?.id]);

  const loadMessageUnreadCount = useCallback(async () => {
    const userId = session?.user?.id;

    if (!userId) {
      setMessageUnreadCount(0);
      return;
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId);

    if (membershipsError) {
      console.error("Failed to load inbox tab memberships:", membershipsError);
      return;
    }

    const memberRows = (memberships || []) as ConversationMemberBadgeRow[];
    const conversationIds = memberRows.map((membership) => membership.conversation_id);

    if (conversationIds.length === 0) {
      setMessageUnreadCount(0);
      return;
    }

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("conversation_id, sender_id, created_at")
      .in("conversation_id", conversationIds);

    if (messagesError) {
      console.error("Failed to load inbox tab unread messages:", messagesError);
      return;
    }

    const readMap = new Map(
      memberRows.map((membership) => [membership.conversation_id, membership.last_read_at])
    );

    const nextCount = ((messages || []) as MessageBadgeRow[]).reduce((total, message) => {
      if (message.sender_id === userId) return total;

      const lastReadAt = readMap.get(message.conversation_id);
      if (!lastReadAt || message.created_at > lastReadAt) return total + 1;

      return total;
    }, 0);

    setMessageUnreadCount(nextCount);
  }, [session?.user?.id]);

  useEffect(() => {
    if (loading) return;
    void loadMessageUnreadCount();
    void loadNotificationUnreadCount();
  }, [loadMessageUnreadCount, loadNotificationUnreadCount, loading]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (loading || !userId) return;

    const messageChannel = supabase
      .channel(`inbox-tabs-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          void loadMessageUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_members",
        },
        () => {
          void loadMessageUnreadCount();
        }
      )
      .subscribe();

    const notificationChannel = supabase
      .channel(`inbox-tabs-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadNotificationUnreadCount();
        }
      )
      .subscribe();

    const handleNotificationsRead = () => {
      setNotificationUnreadCount(0);
    };

    window.addEventListener("crimson-notifications-read", handleNotificationsRead);

    return () => {
      window.removeEventListener("crimson-notifications-read", handleNotificationsRead);
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(notificationChannel);
    };
  }, [loadMessageUnreadCount, loadNotificationUnreadCount, loading, session?.user?.id]);

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[90] border-b border-white/10 bg-[#050505]/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <Link
            href="/inbox"
            prefetch
            className={`rounded-lg px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.18em] transition ${
              activeTab === "messages"
                ? "bg-[#7f111b]/35 text-[#f4dadd]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Messages
            <TabBadge count={messageUnreadCount} />
          </Link>
          <Link
            href="/inbox?tab=notifications"
            prefetch
            className={`rounded-lg px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.18em] transition ${
              activeTab === "notifications"
                ? "bg-[#7f111b]/35 text-[#f4dadd]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Notifications
            <TabBadge count={notificationUnreadCount} />
          </Link>
        </div>
      </div>

      <div className="pt-[calc(env(safe-area-inset-top)+4.25rem)]">
        {activeTab === "notifications" ? <NotificationsPanel /> : <MessagesPanel />}
      </div>
    </>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050405] px-5 pt-[calc(env(safe-area-inset-top)+5rem)] text-white">
          <div className="mx-auto max-w-2xl space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex animate-pulse items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-36 rounded-full bg-white/10" />
                    <div className="h-2 w-52 max-w-full rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      }
    >
      <InboxTabs />
    </Suspense>
  );
}
