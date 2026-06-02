"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import {
  actorDisplayName,
  actorPhotoUrl,
  actorProfileHref,
  formatRelativeNotificationTime,
  isKnownNotificationType,
  notificationDestination,
  notificationSummary,
  notificationTypeLabel,
  type NotificationActor,
  type NotificationItem,
  type NotificationType,
} from "@/lib/notifications";
import { PushNotificationSettings } from "@/components/push/PushNotificationSettings";
import { supabase } from "@/lib/supabase";

type NotificationRow = NotificationItem & {
  user_id: string;
};

type NotificationGroup = {
  label: "Today" | "Yesterday" | "Earlier";
  notifications: NotificationRow[];
};

function notificationDateLabel(createdAt: string): NotificationGroup["label"] {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

function groupNotifications(notifications: NotificationRow[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [
    { label: "Today", notifications: [] },
    { label: "Yesterday", notifications: [] },
    { label: "Earlier", notifications: [] },
  ];

  const groupsByLabel = new Map(groups.map((group) => [group.label, group]));

  for (const notification of notifications) {
    groupsByLabel.get(notificationDateLabel(notification.created_at))?.notifications.push(notification);
  }

  return groups.filter((group) => group.notifications.length > 0);
}

function actorInitials(actor: NotificationActor | null | undefined, fallback: string) {
  const name = actorDisplayName(actor) || fallback || "Crimson";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || "C";
}

function NotificationAvatar({
  actor,
  fallback,
}: {
  actor: NotificationActor | null | undefined;
  fallback: string;
}) {
  const photo = actorPhotoUrl(actor);
  const name = actorDisplayName(actor);

  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#7f111b]/80">
      {photo ? (
        <Image
          src={photo}
          alt={name}
          fill
          sizes="44px"
          className="object-cover"
          unoptimized={photo.includes("supabase")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#f4dadd]">
          {actorInitials(actor, fallback)}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [actorsById, setActorsById] = useState<Record<string, NotificationActor>>({});
  const [loading, setLoading] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );
  const notificationGroups = useMemo(() => groupNotifications(notifications), [notifications]);

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
        .select(
          "id, user_id, type, title, body, ride_id, conversation_id, actor_id, read_at, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to load notifications:", error);
        if (active) setLoading(false);
        return;
      }

      const rows = (data || [])
        .filter((row) => isKnownNotificationType(String(row.type)))
        .map((row) => ({
          ...(row as NotificationRow),
          type: row.type as NotificationType,
        }));

      const actorIds = Array.from(
        new Set(rows.map((notification) => notification.actor_id).filter(Boolean))
      ) as string[];

      if (actorIds.length > 0) {
        const { data: actors, error: actorsError } = await supabase
          .from("profiles")
          .select("id, username, display_name, full_name, profile_image_url, avatar_url")
          .in("id", actorIds);

        if (actorsError) {
          console.error("Failed to load notification actors:", actorsError);
        } else if (active) {
          setActorsById(
            Object.fromEntries(
              ((actors || []) as NotificationActor[]).map((actor) => [actor.id, actor])
            )
          );
        }
      } else if (active) {
        setActorsById({});
      }

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

  const topPadding = embedded
    ? "pt-4"
    : "pt-[calc(env(safe-area-inset-top)+28px)]";

  return (
    <main className="relative min-h-full overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 44% at 50% 0%, rgba(104,0,11,0.42), transparent 58%), linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 34%)",
        }}
      />

      <div
        className={`relative mx-auto max-w-[760px] px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] ${topPadding} sm:px-6`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">Notifications</p>

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
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">Activity</p>
          <h1 className="mt-3 font-serif text-[46px] leading-none text-[#f4f0ea] sm:text-7xl">
            Notifications
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Follows, meet joins, removals, cancellations, ride endings, and meet chat in one ledger.
          </p>
        </header>

        <PushNotificationSettings />

        <section className="mt-7">
          {loading ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 text-sm text-zinc-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center">
              <p className="font-serif text-[30px] leading-none text-[#f4f0ea]">No notifications yet.</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Profile and meet activity will appear here when riders follow, join, leave, or chat.
              </p>
              <Link
                href="/rides"
                className="mt-5 inline-flex rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/40"
              >
                View Meets
              </Link>
            </div>
          ) : (
            <div className="grid gap-7">
              {notificationGroups.map((group) => (
                <div key={group.label}>
                  <h2 className="mb-3 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    {group.label}
                  </h2>

                  <div className="grid gap-3">
                    {group.notifications.map((notification) => {
                      const actor = notification.actor_id
                        ? actorsById[notification.actor_id]
                        : null;
                      const summary = notificationSummary(notification, actor);
                      const href = notificationDestination(notification, actor);
                      const isUnread = !notification.read_at;

                      return (
                        <Link
                          key={notification.id}
                          href={href}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                            isUnread
                              ? "border-[#7f111b]/60 bg-[#7f111b]/12 hover:bg-[#7f111b]/18"
                              : "border-white/10 bg-white/[0.025] hover:border-white/20"
                          }`}
                        >
                          <NotificationAvatar actor={actor} fallback={notification.title} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase tracking-[0.18em] text-[#d85f6c]">
                                  {notificationTypeLabel(notification.type)}
                                </p>
                                <h3
                                  className={`mt-1 text-sm leading-5 ${
                                    isUnread ? "font-semibold text-zinc-50" : "font-medium text-zinc-200"
                                  }`}
                                >
                                  {summary}
                                </h3>
                              </div>
                              <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                                {formatRelativeNotificationTime(notification.created_at)}
                              </span>
                            </div>

                            {notification.body &&
                              notification.body.trim() !== summary.trim() && (
                                <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
                                  {notification.body}
                                </p>
                              )}

                            {isUnread && (
                              <span className="mt-2 inline-flex rounded-full border border-[#7f111b]/50 bg-[#7f111b]/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[#f0c9ce]">
                                New
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
