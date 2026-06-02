"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { InboxOverflowMenu } from "@/components/inbox/InboxOverflowMenu";
import MessagesPanel from "@/components/inbox/MessagesPanel";
import NotificationsPanel from "@/components/inbox/NotificationsPanel";
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

const SWIPE_THRESHOLD_PX = 56;
const SWIPE_COMMIT_RATIO = 0.18;

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

export default function InboxSwipeTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragAxis = useRef<"horizontal" | "vertical" | null>(null);
  const viewportWidth = useRef(0);

  const activeTab: InboxTab =
    searchParams.get("tab") === "notifications" ? "notifications" : "messages";
  const activeIndex = activeTab === "messages" ? 0 : 1;

  const setTab = useCallback(
    (tab: InboxTab) => {
      const nextUrl = tab === "notifications" ? "/inbox?tab=notifications" : "/inbox";
      router.replace(nextUrl, { scroll: false });
      setDragOffset(0);
      setIsDragging(false);
      dragAxis.current = null;
    },
    [router]
  );

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
        { event: "*", schema: "public", table: "messages" },
        () => {
          void loadMessageUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        () => {
          void loadMessageUnreadCount();
        }
      )
      .subscribe();

    const notificationChannel = supabase
      .channel(`inbox-tabs-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
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

  useEffect(() => {
    setDragOffset(0);
    setIsDragging(false);
    dragAxis.current = null;
  }, [activeTab]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateWidth = () => {
      viewportWidth.current = node.clientWidth;
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  function commitSwipe(deltaX: number) {
    const width = viewportWidth.current || 1;

    if (deltaX <= -SWIPE_THRESHOLD_PX || deltaX / width <= -SWIPE_COMMIT_RATIO) {
      if (activeIndex < 1) setTab("notifications");
      return;
    }

    if (deltaX >= SWIPE_THRESHOLD_PX || deltaX / width >= SWIPE_COMMIT_RATIO) {
      if (activeIndex > 0) setTab("messages");
    }
  }

  function beginDrag(clientX: number, clientY: number) {
    dragStartX.current = clientX;
    dragStartY.current = clientY;
    dragAxis.current = null;
    setIsDragging(true);
  }

  function moveDrag(clientX: number, clientY: number) {
    const deltaX = clientX - dragStartX.current;
    const deltaY = clientY - dragStartY.current;

    if (!dragAxis.current) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      dragAxis.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }

    if (dragAxis.current !== "horizontal") return;

    const width = viewportWidth.current || 1;
    const atStart = activeIndex === 0 && deltaX > 0;
    const atEnd = activeIndex === 1 && deltaX < 0;
    const resistedDelta = atStart || atEnd ? deltaX * 0.35 : deltaX;

    setDragOffset(Math.max(-width, Math.min(width, resistedDelta)));
  }

  function endDrag(clientX: number, clientY: number) {
    const deltaX = clientX - dragStartX.current;
    if (dragAxis.current === "horizontal") {
      commitSwipe(deltaX);
    }
    setDragOffset(0);
    setIsDragging(false);
    dragAxis.current = null;
  }

  function onTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) return;
    beginDrag(event.touches[0].clientX, event.touches[0].clientY);
  }

  function onTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) return;
    moveDrag(event.touches[0].clientX, event.touches[0].clientY);
    if (dragAxis.current === "horizontal") event.preventDefault();
  }

  function onTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    endDrag(touch.clientX, touch.clientY);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    beginDrag(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !isDragging) return;
    moveDrag(event.clientX, event.clientY);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    endDrag(event.clientX, event.clientY);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const translateX =
    -activeIndex * 50 + (viewportWidth.current ? (dragOffset / viewportWidth.current) * 50 : 0);

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[90] border-b border-white/10 bg-[#050505]/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
        <div className="mx-auto mb-2 flex max-w-sm items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Inbox</p>
          <InboxOverflowMenu />
        </div>
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setTab("messages")}
            className={`rounded-lg px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.18em] transition ${
              activeTab === "messages"
                ? "bg-[#7f111b]/35 text-[#f4dadd]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Messages
            <TabBadge count={messageUnreadCount} />
          </button>
          <button
            type="button"
            onClick={() => setTab("notifications")}
            className={`rounded-lg px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.18em] transition ${
              activeTab === "notifications"
                ? "bg-[#7f111b]/35 text-[#f4dadd]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Notifications
            <TabBadge count={notificationUnreadCount} />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="fixed inset-x-0 bottom-0 top-[calc(env(safe-area-inset-top)+4.25rem)] overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={`flex h-full w-[200%] ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
          style={{ transform: `translateX(${translateX}%)` }}
        >
          <div className="h-full w-1/2 shrink-0 overflow-y-auto overscroll-contain">
            <MessagesPanel embedded />
          </div>
          <div className="h-full w-1/2 shrink-0 overflow-y-auto overscroll-contain">
            <NotificationsPanel embedded />
          </div>
        </div>
      </div>
    </>
  );
}
