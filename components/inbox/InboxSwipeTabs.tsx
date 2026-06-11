"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { InboxOverflowMenu } from "@/components/inbox/InboxOverflowMenu";
import MessagesPanel from "@/components/inbox/MessagesPanel";
import NotificationsPanel from "@/components/inbox/NotificationsPanel";
import { PushPermissionPrompt } from "@/components/push/PushPermissionPrompt";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";
import { CS_CTA_PRIMARY_MD, csPill } from "@/lib/crimson-accent";
import {
  blockedUserIdSet,
  countUnreadMessages,
  type ConversationMemberBadgeRow,
  type MessageBadgeRow,
} from "@/lib/messages/unread-message-count";
import { formatNavBadgeCount } from "@/lib/nav-badge-format";
import { supabase } from "@/lib/supabase";

type InboxTab = "messages" | "notifications";

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-1 text-[9px] font-semibold leading-none text-[#e87a82]">
      {formatNavBadgeCount(count)}
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
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const activeTab: InboxTab =
    searchParams.get("tab") === "notifications" ? "notifications" : "messages";
  const activeIndex = activeTab === "messages" ? 0 : 1;
  const swipeEnabled = !threadOpen;
  const [mountedTabs, setMountedTabs] = useState<Set<InboxTab>>(() => new Set([activeTab]));

  useEffect(() => {
    setMountedTabs((current) => {
      if (current.has(activeTab)) return current;
      const next = new Set(current);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

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
      onIndexChange: (index) => {
        const tab: InboxTab = index === 0 ? "messages" : "notifications";
        setMountedTabs((current) => {
          if (current.has(tab)) return current;
          const next = new Set(current);
          next.add(tab);
          return next;
        });
        setTab(tab);
      },
    });

  useEffect(() => {
    if (!isDragging) return;
    const adjacentTab: InboxTab = activeIndex === 0 ? "notifications" : "messages";
    setMountedTabs((current) => {
      if (current.has(adjacentTab)) return current;
      const next = new Set(current);
      next.add(adjacentTab);
      return next;
    });
  }, [activeIndex, isDragging]);

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

    const [{ data: memberships, error: membershipsError }, { data: blocks, error: blocksError }] =
      await Promise.all([
        supabase
          .from("conversation_members")
          .select("conversation_id, last_read_at")
          .eq("user_id", userId),
        supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
      ]);

    if (membershipsError) {
      console.error("Failed to load inbox tab memberships:", membershipsError);
      return;
    }

    if (blocksError) {
      console.error("Failed to load inbox tab blocks:", blocksError);
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

    const blockedIds = blockedUserIdSet(userId, blocks || []);
    const nextCount = countUnreadMessages(
      userId,
      memberRows,
      (messages || []) as MessageBadgeRow[],
      blockedIds,
    );

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

  useLayoutEffect(() => {
    if (threadOpen) {
      return;
    }

    const header = headerRef.current;
    if (!header) {
      return;
    }

    const measure = () => {
      setHeaderHeight(header.offsetHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(header);

    return () => observer.disconnect();
  }, [threadOpen, activeTab]);

  const viewportTop = threadOpen ? 0 : headerHeight;

  return (
    <>
      {!threadOpen && (
        <div
          ref={headerRef}
          className="fixed left-0 right-0 top-0 z-[90] border-b border-white/10 bg-black px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
        >
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
        className={`fixed inset-x-0 bottom-0 w-full max-w-full touch-none overflow-hidden ${threadOpen ? "pointer-events-none invisible" : ""}`}
        style={{ top: viewportTop }}
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
            {mountedTabs.has("messages") ? (
              <MessagesPanel
                embedded
                inboxHeaderOffsetPx={headerHeight}
                newMessageRequestId={newMessageRequestId}
                onThreadActiveChange={setThreadOpen}
              />
            ) : null}
          </div>
          <div className="h-full shrink-0 touch-pan-y overflow-y-auto overscroll-contain" style={{ width: `${panelWidthPercent}%` }}>
            {mountedTabs.has("notifications") ? <NotificationsPanel embedded /> : null}
          </div>
        </div>
      </div>

      <PushPermissionPrompt allowDeniedGuidance={activeTab === "notifications"} />
    </>
  );
}
