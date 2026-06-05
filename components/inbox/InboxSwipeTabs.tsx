"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { InboxOverflowMenu } from "@/components/inbox/InboxOverflowMenu";
import MessagesPanel from "@/components/inbox/MessagesPanel";
import NotificationsPanel from "@/components/inbox/NotificationsPanel";
import { PushPermissionPrompt } from "@/components/push/PushPermissionPrompt";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";
import { CS_CTA_PRIMARY_MD, csPill } from "@/lib/crimson-accent";
import { supabase } from "@/lib/supabase";

type InboxTab = "messages" | "notifications";

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
    <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-1 text-[9px] font-semibold leading-none text-[#e87a82]">
      {badgeLabel(count)}
    </span>
  );
}

export default function InboxSwipeTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [newMessageRequestId, setNewMessageRequestId] = useState(0);
  const [threadOpen, setThreadOpen] = useState(false);

  const activeTab: InboxTab =
    searchParams.get("tab") === "notifications" ? "notifications" : "messages";
  const activeIndex = activeTab === "messages" ? 0 : 1;
  const swipeEnabled = !threadOpen;

  const setTab = useCallback(
    (tab: InboxTab) => {
      const nextUrl = tab === "notifications" ? "/inbox?tab=notifications" : "/inbox";
      router.replace(nextUrl, { scroll: false });
    },
    [router],
  );

  const { viewportRef, swipeHandlers, translateX, isDragging, panelWidthPercent } =
    useHorizontalSwipe({
      activeIndex,
      panelCount: 2,
      enabled: swipeEnabled,
      onIndexChange: (index) => setTab(index === 0 ? "messages" : "notifications"),
    });

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
      memberRows.map((membership) => [membership.conversation_id, membership.last_read_at]),
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
        { event: "*", schema: "public", table: "messages" },
        () => {
          void loadMessageUnreadCount();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        () => {
          void loadMessageUnreadCount();
        },
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
        },
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

  const viewportTopClass = threadOpen
    ? "top-0"
    : activeTab === "messages"
      ? "top-[calc(env(safe-area-inset-top)+14.25rem)]"
      : "top-[calc(env(safe-area-inset-top)+6.75rem)]";

  return (
    <>
      {!threadOpen && (
        <div className="fixed left-0 right-0 top-0 z-[90] border-b border-white/10 bg-black px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="mx-auto mb-2 flex max-w-sm items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Inbox</p>
            <InboxOverflowMenu activeTab={activeTab} />
          </div>
          <div className="mx-auto flex max-w-sm gap-2">
            <button
              type="button"
              onClick={() => setTab("messages")}
              className={`flex-1 text-center ${csPill(activeTab === "messages", "md")} py-2.5 text-[10px] tracking-[0.18em]`}
            >
              Messages
              <TabBadge count={messageUnreadCount} />
            </button>
            <button
              type="button"
              onClick={() => setTab("notifications")}
              className={`flex-1 text-center ${csPill(activeTab === "notifications", "md")} py-2.5 text-[10px] tracking-[0.18em]`}
            >
              Notifications
              <TabBadge count={notificationUnreadCount} />
            </button>
          </div>

          {activeTab === "messages" && (
            <div className="mx-auto mt-3 max-w-sm">
              <button
                type="button"
                onClick={() => setNewMessageRequestId((current) => current + 1)}
                className={`w-full ${CS_CTA_PRIMARY_MD}`}
              >
                + New Message
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={viewportRef}
        className={`fixed inset-x-0 bottom-0 w-full max-w-full touch-none overflow-hidden ${viewportTopClass} ${threadOpen ? "pointer-events-none invisible" : ""}`}
        {...swipeHandlers}
      >
        <div
          className={`flex h-full max-w-none ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
          style={{
            width: "200%",
            transform: `translateX(${translateX}%)`,
          }}
        >
          <div className="h-full shrink-0 touch-pan-y overflow-y-auto overscroll-contain" style={{ width: `${panelWidthPercent}%` }}>
            <MessagesPanel
              embedded
              newMessageRequestId={newMessageRequestId}
              onThreadActiveChange={setThreadOpen}
            />
          </div>
          <div className="h-full shrink-0 touch-pan-y overflow-y-auto overscroll-contain" style={{ width: `${panelWidthPercent}%` }}>
            <NotificationsPanel embedded />
          </div>
        </div>
      </div>

      <PushPermissionPrompt allowDeniedGuidance={activeTab === "notifications"} />
    </>
  );
}
