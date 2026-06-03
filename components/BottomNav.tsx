"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type RideReadRow = {
  ride_id: string;
  last_read_at: string;
};

type RideMessageBadgeRow = {
  ride_id: string;
  user_id: string;
  created_at: string;
};

type RideBadgeRow = {
  id: string;
  date: string | null;
  time: string | null;
};

type ConversationMemberBadgeRow = {
  conversation_id: string;
  last_read_at: string | null;
};

type MessageBadgeRow = {
  conversation_id: string;
  sender_id: string;
  created_at: string;
};

const NAV = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9z" />
      </svg>
    ),
  },
  {
    href: "/connect",
    label: "Riders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="11" cy="11" r="6" />
        <path d="m21 21-5-5" />
      </svg>
    ),
  },
  {
    href: "/shop",
    label: "Shop",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
  {
    href: "/rides",
    label: "Meets",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="5.5" cy="17" r="3" />
        <circle cx="18.5" cy="17" r="3" />
        <path d="M8 17h4l4-7h3" />
        <path d="M10 6h4l2 4" />
      </svg>
    ),
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M4 6.5C4 5.4 4.9 4.5 6 4.5h12c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H9l-4 3v-3H6c-1.1 0-2-.9-2-2v-9z" />
        <path d="M8 8.5h8" />
        <path d="M8 12h5" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="12" cy="8.5" r="3.75" />
        <path d="M4.5 20c0-3.5 3.4-6 7.5-6s7.5 2.5 7.5 6" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [meetUnreadCounts, setMeetUnreadCounts] = useState<Record<string, number>>({});
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  const meetUnreadTotal = useMemo(
    () => Object.values(meetUnreadCounts).reduce((total, count) => total + count, 0),
    [meetUnreadCounts]
  );
  const meetBadgeLabel = meetUnreadTotal > 9 ? "9+" : String(meetUnreadTotal);
  const inboxUnreadTotal = messageUnreadCount + notificationUnreadCount;
  const inboxBadgeLabel = inboxUnreadTotal > 9 ? "9+" : String(inboxUnreadTotal);

  const isUpcomingRide = useCallback((ride: RideBadgeRow) => {
    const date = ride.date?.trim();
    if (!date) return true;

    const time = ride.time?.trim();
    const safeTime = time && time.includes(":") ? time : "23:59";
    const parsed = new Date(`${date}T${safeTime}`);

    return Number.isNaN(parsed.getTime()) || parsed.getTime() >= Date.now();
  }, []);

  const loadMeetUnreadCounts = useCallback(async () => {
    const userId = session?.user?.id;

    if (!userId) {
      setMeetUnreadCounts({});
      return;
    }

    const { data: rides, error: ridesError } = await supabase
      .from("rides")
      .select("id, date, time")
      .eq("status", "active");

    if (ridesError) {
      console.error("Failed to load meet nav rides:", ridesError);
      return;
    }

    const rideIds = ((rides || []) as RideBadgeRow[]).filter(isUpcomingRide).map((ride) => ride.id);

    if (rideIds.length === 0) {
      setMeetUnreadCounts({});
      return;
    }

    const [
      { data: readRows, error: readsError },
      { data: messageRows, error: messagesError },
    ] = await Promise.all([
      supabase
        .from("ride_message_reads")
        .select("ride_id, last_read_at")
        .eq("user_id", userId)
        .in("ride_id", rideIds),
      supabase
        .from("ride_messages")
        .select("ride_id, user_id, created_at")
        .in("ride_id", rideIds),
    ]);

    if (readsError) {
      console.error("Failed to load meet nav read markers:", readsError);
    }

    if (messagesError) {
      console.error("Failed to load meet nav unread messages:", messagesError);
      return;
    }

    const readMap = new Map(
      ((readRows || []) as RideReadRow[]).map((row) => [row.ride_id, row.last_read_at])
    );
    const nextCounts = Object.fromEntries(rideIds.map((rideId) => [rideId, 0]));

    for (const message of (messageRows || []) as RideMessageBadgeRow[]) {
      if (message.user_id === userId) continue;

      const lastReadAt = readMap.get(message.ride_id);
      if (!lastReadAt || message.created_at > lastReadAt) {
        nextCounts[message.ride_id] = (nextCounts[message.ride_id] || 0) + 1;
      }
    }

    setMeetUnreadCounts(nextCounts);
  }, [isUpcomingRide, session?.user?.id]);

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
      console.error("Failed to load notification unread count:", error);
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
      console.error("Failed to load inbox nav memberships:", membershipsError);
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
      console.error("Failed to load inbox nav unread messages:", messagesError);
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
    void loadMeetUnreadCounts();
    void loadMessageUnreadCount();
    void loadNotificationUnreadCount();
  }, [loadMeetUnreadCounts, loadMessageUnreadCount, loadNotificationUnreadCount, loading]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (loading || !userId) return;

    const channel = supabase
      .channel(`bottom-nav-meet-unread-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_messages",
        },
        (payload) => {
          const message = payload.new as Partial<RideMessageBadgeRow>;
          if (!message.ride_id || !message.user_id || message.user_id === userId) return;

          void loadMeetUnreadCounts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ride_messages",
        },
        () => {
          void loadMeetUnreadCounts();
        }
      )
      .subscribe();

    const handleMeetRead = (event: Event) => {
      const rideId = (event as CustomEvent<{ rideId?: string }>).detail?.rideId;
      if (!rideId) return;

      setMeetUnreadCounts((current) => ({
        ...current,
        [rideId]: 0,
      }));
    };

    window.addEventListener("crimson-meet-chat-read", handleMeetRead);

    return () => {
      window.removeEventListener("crimson-meet-chat-read", handleMeetRead);
      void supabase.removeChannel(channel);
    };
  }, [loadMeetUnreadCounts, loading, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (loading || !userId) return;

    const channel = supabase
      .channel(`bottom-nav-inbox-messages-${userId}`)
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMessageUnreadCount, loading, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (loading || !userId) return;

    const channel = supabase
      .channel(`bottom-nav-notifications-${userId}`)
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
      void supabase.removeChannel(channel);
    };
  }, [loadNotificationUnreadCount, loading, session?.user?.id]);

  const hideOn = ["/", "/login", "/signup", "/profile/setup"];
  if (hideOn.includes(pathname)) return null;
  if (pathname.startsWith("/messages/")) return null;

  const isActive = (href: string) => {
    if (href === "/inbox") {
      return pathname === "/inbox" || pathname.startsWith("/messages") || pathname === "/notifications";
    }
    if (href === "/profile") return pathname === "/profile";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 box-border w-full max-w-full overflow-x-hidden border-t border-white/10 bg-[#050505]/90 pb-[max(0px,calc(env(safe-area-inset-bottom)-18px))] backdrop-blur-xl">
      <ul className="mx-auto flex w-full max-w-full items-stretch justify-between gap-0 overflow-x-hidden pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-0 sm:max-w-3xl">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <li key={n.href} className="flex min-w-0 flex-1 basis-0">
              <Link
                href={n.href}
                prefetch
                onFocus={() => router.prefetch(n.href)}
                onMouseEnter={() => router.prefetch(n.href)}
                className={`flex min-w-0 w-full flex-col items-center justify-center gap-0.5 px-0.5 py-0 transition ${
                  active ? "text-[#e87a82]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span
                  className={`relative shrink-0 ${
                    active ? "drop-shadow-[0_0_8px_rgba(232,122,130,0.7)]" : ""
                  }`}
                >
                  {n.icon}
                  {n.href === "/rides" && meetUnreadTotal > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-1 text-[9px] font-semibold leading-none text-[#e87a82]">
                      {meetBadgeLabel}
                    </span>
                  )}
                  {n.href === "/inbox" && inboxUnreadTotal > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-1 text-[9px] font-semibold leading-none text-[#e87a82]">
                      {inboxBadgeLabel}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate text-center text-[9px] uppercase tracking-[0.2em]">
                  {n.label}
                </span>
                {active && (
                  <span className="h-0.5 w-5 rounded-full bg-[#b4141e]/80" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
