"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import { supabase } from "@/lib/supabase";

type NotificationType =
  | "meet_joined"
  | "meet_left"
  | "meet_chat_message"
  | "meet_chat_photo";

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  ride_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
};

function formatNotificationTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeLabel(type: NotificationType) {
  switch (type) {
    case "meet_joined":
      return "Meet joined";
    case "meet_left":
      return "Meet left";
    case "meet_chat_photo":
      return "Meet photo";
    case "meet_chat_message":
    default:
      return "Meet chat";
  }
}

export default function NotificationsPanel() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  useEffect(() => {
    if (authLoading) return;

    const userId = session?.user?.id;
    if (!userId) {
      router.replace("/login");
      return;
    }

    let active = true;

    async function checkProfileSetup() {
      try {
        const complete = await requireCompleteProfile(userId as string);
        if (active && !complete) router.replace("/profile/setup");
      } catch {
        if (active) router.replace("/profile/setup");
      }
    }

    void checkProfileSetup();

    return () => {
      active = false;
    };
  }, [authLoading, router, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (authLoading || !userId) return;

    let active = true;

    async function loadNotifications() {
      setLoading(true);

      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, body, ride_id, actor_id, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to load notifications:", error);
        if (active) setLoading(false);
        return;
      }

      const rows = (data || []) as NotificationRow[];

      if (active) {
        setNotifications(rows);
        setLoading(false);
      }

      const unreadIds = rows
        .filter((notification) => !notification.read_at)
        .map((notification) => notification.id);

      if (unreadIds.length > 0) {
        const readAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("notifications")
          .update({ read_at: readAt })
          .eq("user_id", userId)
          .in("id", unreadIds);

        if (updateError) {
          console.error("Failed to mark notifications read:", updateError);
          return;
        }

        if (active) {
          setNotifications((current) =>
            current.map((notification) =>
              unreadIds.includes(notification.id)
                ? { ...notification, read_at: readAt }
                : notification
            )
          );
        }

        window.dispatchEvent(new CustomEvent("crimson-notifications-read"));
      }
    }

    void loadNotifications();

    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [authLoading, session?.user?.id]);

  async function markAllRead() {
    const userId = session?.user?.id;
    if (!userId) return;

    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("Failed to mark all notifications read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read_at: notification.read_at || readAt }))
    );
    window.dispatchEvent(new CustomEvent("crimson-notifications-read"));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 44% at 50% 0%, rgba(104,0,11,0.42), transparent 58%), linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 34%)",
        }}
      />

      <div className="relative mx-auto max-w-[760px] px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+28px)] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            Notifications
          </p>

          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100 disabled:border-white/8 disabled:text-zinc-700"
          >
            Mark Read
          </button>
        </div>

        <header className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">
            Meet Activity
          </p>
          <h1 className="mt-3 font-serif text-[46px] leading-none text-[#f4f0ea] sm:text-7xl">
            Notifications
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Meet joins, leaves, chat messages, and shared photos in one quiet ledger.
          </p>
        </header>

        <section className="mt-7">
          {loading ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 text-sm text-zinc-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
              <p className="font-serif text-[30px] leading-none text-[#f4f0ea]">
                No notifications yet.
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Meet activity will appear here when riders join, leave, chat, or share photos.
              </p>
              <Link
                href="/rides"
                className="mt-5 inline-flex rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/40"
              >
                View Meets
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href="/rides"
                  className={`block rounded-lg border p-4 transition ${
                    notification.read_at
                      ? "border-white/10 bg-white/[0.025] hover:border-white/20"
                      : "border-[#7f111b]/60 bg-[#7f111b]/12 hover:bg-[#7f111b]/18"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-[#d85f6c]">
                        {typeLabel(notification.type)}
                      </p>
                      <h2 className="mt-2 text-sm font-semibold text-zinc-100">
                        {notification.title}
                      </h2>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                      {formatNotificationTime(notification.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{notification.body}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
