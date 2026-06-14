"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import { NavTabBadge } from "@/components/NavTabBadge";
import { syncAppIconBadge } from "@/lib/app-icon-badge";
import {
  countUnreadNotificationsByTypes,
  loadConnectNavBadgeCount,
  loadNavBadgeCounts,
  loadProfileNavBadgeCount,
  MEET_ALERT_TYPES,
} from "@/lib/nav-badge-counts";

const BADGE_REFRESH_DEBOUNCE_MS = 400;

const NAV = [
  {
    href: "/dashboard",
    labelKey: "home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9z" />
      </svg>
    ),
  },
  {
    href: "/connect",
    labelKey: "riders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="11" cy="11" r="6" />
        <path d="m21 21-5-5" />
      </svg>
    ),
  },
  {
    href: "/shop",
    labelKey: "shop",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    ),
  },
  {
    href: "/meets",
    labelKey: "meets",
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
    labelKey: "inbox",
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
    labelKey: "profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="12" cy="8.5" r="3.75" />
        <path d="M4.5 20c0-3.5 3.4-6 7.5-6s7.5 2.5 7.5 6" />
      </svg>
    ),
  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, status: profileStatus } = useAuth();
  const { dictionary } = useI18n();
  const navCopy = dictionary.nav;
  const [meetBadgeCount, setMeetBadgeCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [connectBadgeCount, setConnectBadgeCount] = useState(0);
  const [profileBadgeCount, setProfileBadgeCount] = useState(0);

  const inboxUnreadTotal = messageUnreadCount + notificationUnreadCount;
  const badgeRefreshTimerRef = useRef<number | null>(null);
  const badgeRefreshInFlightRef = useRef(false);
  const badgeRefreshQueuedRef = useRef(false);

  const refreshAllBadges = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setMeetBadgeCount(0);
      setMessageUnreadCount(0);
      setNotificationUnreadCount(0);
      setConnectBadgeCount(0);
      setProfileBadgeCount(0);
      void syncAppIconBadge(0);
      return;
    }

    const [navCounts, meetAlerts, connectCount, profileCount] = await Promise.all([
      loadNavBadgeCounts(supabase),
      countUnreadNotificationsByTypes(supabase, userId, MEET_ALERT_TYPES),
      loadConnectNavBadgeCount(supabase, userId),
      loadProfileNavBadgeCount(supabase, userId),
    ]);

    setMeetBadgeCount(navCounts.unreadMeetChatCount + meetAlerts);
    setMessageUnreadCount(navCounts.unreadMessagesCount);
    setNotificationUnreadCount(navCounts.unreadNotificationsCount);
    setConnectBadgeCount(connectCount);
    setProfileBadgeCount(profileCount);
    void syncAppIconBadge(navCounts.totalBadgeCount);
  }, [session?.user?.id]);

  const scheduleBadgeRefresh = useCallback(
    (immediate = false) => {
      if (loading) return;

      const runRefresh = () => {
        if (badgeRefreshInFlightRef.current) {
          badgeRefreshQueuedRef.current = true;
          return;
        }

        badgeRefreshInFlightRef.current = true;
        void refreshAllBadges().finally(() => {
          badgeRefreshInFlightRef.current = false;
          if (badgeRefreshQueuedRef.current) {
            badgeRefreshQueuedRef.current = false;
            runRefresh();
          }
        });
      };

      if (immediate) {
        if (badgeRefreshTimerRef.current) {
          window.clearTimeout(badgeRefreshTimerRef.current);
          badgeRefreshTimerRef.current = null;
        }
        runRefresh();
        return;
      }

      if (badgeRefreshTimerRef.current) {
        window.clearTimeout(badgeRefreshTimerRef.current);
      }

      badgeRefreshTimerRef.current = window.setTimeout(() => {
        badgeRefreshTimerRef.current = null;
        runRefresh();
      }, BADGE_REFRESH_DEBOUNCE_MS);
    },
    [loading, refreshAllBadges],
  );

  useEffect(() => {
    if (loading) return;
    scheduleBadgeRefresh(true);
  }, [loading, scheduleBadgeRefresh]);

  useEffect(() => {
    if (loading) return;
    scheduleBadgeRefresh();
  }, [loading, pathname, scheduleBadgeRefresh]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (loading || !userId) return;

    const channel = supabase
      .channel(`bottom-nav-badges-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_messages" },
        () => scheduleBadgeRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => scheduleBadgeRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        () => scheduleBadgeRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleBadgeRefresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_connections" },
        () => scheduleBadgeRefresh(),
      )
      .subscribe();

    const handleMeetRead = () => scheduleBadgeRefresh();
    const handleNotificationsRead = () => scheduleBadgeRefresh();

    window.addEventListener("crimson-meet-chat-read", handleMeetRead);
    window.addEventListener("crimson-notifications-read", handleNotificationsRead);

    return () => {
      if (badgeRefreshTimerRef.current) {
        window.clearTimeout(badgeRefreshTimerRef.current);
        badgeRefreshTimerRef.current = null;
      }
      window.removeEventListener("crimson-meet-chat-read", handleMeetRead);
      window.removeEventListener("crimson-notifications-read", handleNotificationsRead);
      void supabase.removeChannel(channel);
    };
  }, [loading, scheduleBadgeRefresh, session?.user?.id]);

  const hideOn = ["/", "/login", "/signup", "/profile/setup"];
  if (hideOn.includes(pathname)) return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/messages/")) return null;
  if (profileStatus === "deletion_pending") return null;

  const isActive = (href: string) => {
    if (href === "/inbox") {
      return pathname === "/inbox" || pathname.startsWith("/messages") || pathname === "/notifications";
    }
    if (href === "/profile") return pathname === "/profile";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 box-border w-full max-w-full border-t border-white/10 bg-[#050505] pb-[length:var(--bottom-nav-home-offset)] backdrop-blur-xl">
      <ul className="mx-auto flex w-full max-w-full items-end justify-between gap-0 overflow-visible pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-1.5 sm:max-w-3xl">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <li key={n.href} className="flex min-w-0 flex-1 basis-0 overflow-visible">
              <Link
                href={n.href}
                prefetch
                onFocus={() => router.prefetch(n.href)}
                onMouseEnter={() => router.prefetch(n.href)}
                className={`flex min-w-0 w-full flex-col items-center gap-0 overflow-visible px-0.5 pb-0 pt-0 transition ${
                  active ? "text-[#e87a82]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span
                  className={`relative inline-flex shrink-0 overflow-visible px-1 pt-1 ${
                    active ? "drop-shadow-[0_0_8px_rgba(232,122,130,0.7)]" : ""
                  }`}
                >
                  {n.icon}
                  {n.href === "/meets" ? (
                    <NavTabBadge count={meetBadgeCount} label={navCopy.meets} />
                  ) : null}
                  {n.href === "/inbox" ? (
                    <NavTabBadge count={inboxUnreadTotal} label={navCopy.inbox} />
                  ) : null}
                  {n.href === "/connect" ? (
                    <NavTabBadge count={connectBadgeCount} label={navCopy.riders} />
                  ) : null}
                  {n.href === "/profile" ? (
                    <NavTabBadge count={profileBadgeCount} label={navCopy.profile} />
                  ) : null}
                </span>
                <span className="max-w-full truncate text-center text-[9px] uppercase leading-none tracking-[0.2em]">
                  {navCopy[n.labelKey]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
