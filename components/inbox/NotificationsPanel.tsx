"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";
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
import { NotificationTypeIcon } from "@/components/inbox/notification-type-icon";
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
    <div className={`relative h-11 w-11 shrink-0 ${CS_AVATAR_RING}`}>
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
        <div className={`${CS_AVATAR_FALLBACK} text-xs font-semibold not-italic`}>
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

  useEffect(() => {
    const onMarkedRead = () => {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at || readAt,
        })),
      );
    };

    window.addEventListener("crimson-notifications-read", onMarkedRead);
    return () => window.removeEventListener("crimson-notifications-read", onMarkedRead);
  }, []);

  const topPadding = embedded
    ? "pt-4"
    : "pt-[calc(env(safe-area-inset-top)+28px)]";

  const notificationList = (
    <>
      {loading ? (
        <div className="px-4 py-6 text-sm text-zinc-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-lg font-medium text-white">No notifications yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Follows, meets, and messages will appear here.
          </p>
          <Link
            href="/rides"
            className="mt-5 inline-flex rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-[#e87a82] transition hover:bg-[#b4141e]/30"
          >
            View Meets
          </Link>
        </div>
      ) : (
        <div className={embedded ? "divide-y divide-white/10" : "grid gap-7 px-4 sm:px-6"}>
          {notificationGroups.map((group) => (
            <div key={group.label}>
              <h2
                className={`text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 ${
                  embedded ? "px-3 pb-1 pt-4" : "mb-3"
                }`}
              >
                {group.label}
              </h2>

              <div className={embedded ? "" : "grid gap-3"}>
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
                      className={
                        embedded
                          ? `flex items-center gap-3 px-3 py-3.5 transition active:bg-white/[0.04] ${
                              isUnread ? "bg-white/[0.02]" : ""
                            }`
                          : `flex items-center gap-3 rounded-lg border p-3 transition ${
                              isUnread
                                ? "border-[#b4141e] bg-[#b4141e]/10 hover:bg-[#b4141e]/20"
                                : "border-white/10 bg-white/[0.025] hover:border-white/20"
                            }`
                      }
                    >
                      {embedded ? (
                        <NotificationTypeIcon type={notification.type} />
                      ) : (
                        <NotificationAvatar actor={actor} fallback={notification.title} />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-[15px] leading-snug ${
                              isUnread ? "font-semibold text-white" : "font-medium text-zinc-200"
                            }`}
                          >
                            {summary}
                          </p>
                          <span className="shrink-0 text-xs text-zinc-500">
                            {formatRelativeNotificationTime(notification.created_at)}
                          </span>
                        </div>

                        {!embedded && (
                          <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-[#d85f6c]">
                            {notificationTypeLabel(notification.type)}
                          </p>
                        )}

                        {notification.body && notification.body.trim() !== summary.trim() && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">
                            {notification.body}
                          </p>
                        )}
                      </div>

                      {isUnread && (
                        <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-1 text-[10px] font-semibold text-[#e87a82]">
                          1
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-black text-zinc-100">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pt-2">
          {notificationList}
        </div>
      </main>
    );
  }

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
        className={`relative mx-auto max-w-[760px] pb-[calc(env(safe-area-inset-bottom)+112px)] ${topPadding} sm:px-6`}
      >
        <header className="px-4 sm:px-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">Activity</p>
          <h1 className="mt-3 font-serif text-[46px] leading-none text-[#f4f0ea] sm:text-7xl">
            Notifications
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Follows, meet joins, removals, cancellations, ride endings, and meet chat in one ledger.
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Use the ⋯ menu to mark all as read or open notification settings.
          </p>
        </header>

        <section className="mt-7">{notificationList}</section>
      </div>
    </main>
  );
}
