"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    href: "/messages",
    label: "Messages",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M4 6.5C4 5.4 4.9 4.5 6 4.5h12c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H9l-4 3v-3H6c-1.1 0-2-.9-2-2v-9z" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "Alerts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M18 9.5a6 6 0 0 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5z" />
        <path d="M9.75 19a2.25 2.25 0 0 0 4.5 0" />
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
  const { session, loading } = useAuth();
  const [meetUnreadCounts, setMeetUnreadCounts] = useState<Record<string, number>>({});
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  const meetUnreadTotal = useMemo(
    () => Object.values(meetUnreadCounts).reduce((total, count) => total + count, 0),
    [meetUnreadCounts]
  );
  const meetBadgeLabel = meetUnreadTotal > 9 ? "9+" : String(meetUnreadTotal);
  const notificationBadgeLabel =
    notificationUnreadCount > 9 ? "9+" : String(notificationUnreadCount);

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

  useEffect(() => {
    if (loading) return;
    void loadMeetUnreadCounts();
    void loadNotificationUnreadCount();
  }, [loadMeetUnreadCounts, loadNotificationUnreadCount, loading]);

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
    if (href === "/messages") return pathname === "/messages";
    if (href === "/notifications") return pathname === "/notifications";
    if (href === "/profile") return pathname === "/profile";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050505]/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-3xl items-center justify-around px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                className={`flex flex-col items-center gap-1 px-1.5 py-1 transition ${
                  active ? "text-[#e87a82]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span
                  className={`relative ${
                    active ? "drop-shadow-[0_0_8px_rgba(232,122,130,0.7)]" : ""
                  }`}
                >
                  {n.icon}
                  {n.href === "/rides" && meetUnreadTotal > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#050505] bg-[#7f111b] px-1 text-[9px] font-semibold leading-none text-[#f4dadd] shadow-[0_0_12px_rgba(127,17,27,0.8)]">
                      {meetBadgeLabel}
                    </span>
                  )}
                  {n.href === "/notifications" && notificationUnreadCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#050505] bg-[#7f111b] px-1 text-[9px] font-semibold leading-none text-[#f4dadd] shadow-[0_0_12px_rgba(127,17,27,0.8)]">
                      {notificationBadgeLabel}
                    </span>
                  )}
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em]">
                  {n.label}
                </span>
                {active && (
                  <span className="h-0.5 w-5 rounded-full bg-[#b4141e] shadow-[0_0_8px_rgba(180,20,30,0.8)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
