"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Ride } from "@/app/rides/page";
import { supabase } from "@/lib/supabase";

const RideMap = dynamic(() => import("@/components/RideMap"), { ssr: false });

interface Props {
  ride: Ride;
  isGoing: boolean;
  onJoin: () => void;
  onRead: (rideId: string) => void;
  onClose: () => void;
}

type RideMessage = {
  id: string;
  ride_id: string;
  user_id: string;
  body: string;
  kind: "message" | "system";
  created_at: string;
  sender?: {
    display_name: string | null;
    full_name: string | null;
    username: string | null;
    profile_image_url: string | null;
    avatar_url: string | null;
  } | null;
};

const RIDE_MESSAGE_SELECT = `
  id,
  ride_id,
  user_id,
  body,
  kind,
  created_at,
  sender:profiles!ride_messages_user_id_fkey (
    display_name,
    full_name,
    username,
    profile_image_url,
    avatar_url
  )
`;

function formatTime(time: string) {
  if (!time) return "";

  if (
    time.includes("AM") ||
    time.includes("PM") ||
    time.includes("am") ||
    time.includes("pm")
  ) {
    return time;
  }

  if (!time.includes(":")) return time;

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours));
  date.setMinutes(Number(minutes));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMessageTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeMessages(data: unknown): RideMessage[] {
  if (!Array.isArray(data)) return [];

  return data.map((message) => {
    const raw = message as RideMessage & { sender?: RideMessage["sender"] | RideMessage["sender"][] };

    return {
      ...raw,
      kind: raw.kind || "message",
      sender: Array.isArray(raw.sender) ? raw.sender[0] ?? null : raw.sender ?? null,
    };
  });
}

function sortMessages(messages: RideMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function RideDetailsModal({ ride, isGoing, onJoin, onRead, onClose }: Props) {
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isHost = ride.hostId === currentUserId;
  const canUseChat = isGoing || isHost;

  useEffect(() => {
    let active = true;

    async function fetchMessage(messageId: string) {
      const { data, error } = await supabase
        .from("ride_messages")
        .select(RIDE_MESSAGE_SELECT)
        .eq("id", messageId)
        .single();

      if (error) {
        console.error("Failed to load realtime ride chat message:", error);
        return;
      }

      if (!active) return;

      const [message] = normalizeMessages([data]);
      if (!message) return;

      setMessages((current) =>
        sortMessages([...current.filter((item) => item.id !== message.id), message])
      );
      onRead(ride.id);
    }

    async function loadChat() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setCurrentUserId(user?.id ?? null);

      const { data, error } = await supabase
        .from("ride_messages")
        .select(RIDE_MESSAGE_SELECT)
        .eq("ride_id", ride.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load ride chat:", error);
        return;
      }

      if (active) {
        setMessages(normalizeMessages(data));
        onRead(ride.id);
      }
    }

    void loadChat();

    const channel = supabase
      .channel(`ride-chat-${ride.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_messages",
          filter: `ride_id=eq.${ride.id}`,
        },
        (payload) => {
          const messageId = (payload.new as { id?: string }).id;
          if (messageId) void fetchMessage(messageId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ride_messages",
          filter: `ride_id=eq.${ride.id}`,
        },
        (payload) => {
          const messageId = (payload.old as { id?: string }).id;
          if (!messageId) return;
          setMessages((current) => current.filter((message) => message.id !== messageId));
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [onRead, ride.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function sendMessage() {
    const body = draft.trim();
    if (!body || sending || !currentUserId) return;

    setSending(true);

    const { error } = await supabase.from("ride_messages").insert({
      ride_id: ride.id,
      user_id: currentUserId,
      body,
    });

    if (error) {
      console.error("Failed to send ride chat message:", error);
      alert("You must join this meet before messaging.");
      setSending(false);
      return;
    }

    setDraft("");
    setSending(false);
  }

  async function deleteMessage(messageId: string) {
    if (!currentUserId) return;

    setDeletingMessageIds((current) => new Set(current).add(messageId));

    const { error } = await supabase
      .from("ride_messages")
      .delete()
      .eq("id", messageId)
      .eq("ride_id", ride.id);

    if (error) {
      console.error("Failed to delete ride chat message:", error);
      alert("Could not delete this message.");
      setDeletingMessageIds((current) => {
        const next = new Set(current);
        next.delete(messageId);
        return next;
      });
      return;
    }

    setMessages((current) => current.filter((message) => message.id !== messageId));
    setDeletingMessageIds((current) => {
      const next = new Set(current);
      next.delete(messageId);
      return next;
    });
  }

  const safeRoute =
    Array.isArray(ride.route) &&
    ride.route.length > 0 &&
    ride.route.every(
      (p) =>
        typeof p.lat === "number" &&
        typeof p.lng === "number" &&
        isFinite(p.lat) &&
        isFinite(p.lng)
    )
      ? ride.route
      : [];

  const hasRoute = safeRoute.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ride.name}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0d0608] shadow-2xl sm:rounded-2xl">
        <div className="relative h-44 shrink-0 overflow-hidden">
          <Image
            src={ride.cover}
            alt={ride.name}
            fill
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0608] via-[#0d0608]/40 to-transparent" />

          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-zinc-300 backdrop-blur-sm transition hover:text-white"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-200 backdrop-blur-sm">
              {ride.type}
            </span>

            {ride.privacy === "Invite" && (
              <span className="rounded-full border border-[#7f111b]/60 bg-[#7f111b]/20 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#f4dadd]">
                Invite Only
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-4 right-12">
            <p className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              {ride.date} / {formatTime(ride.time)}
            </p>
            <h2 className="text-lg font-semibold leading-tight text-white">
              {ride.name}
            </h2>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 pb-6 pt-5 sm:max-h-[50vh]">
          <div
            className="mb-5 overflow-hidden rounded-lg border border-white/10"
            style={{ height: 260, touchAction: "none" }}
          >
            {hasRoute ? (
              <RideMap
                lat={ride.lat}
                lng={ride.lng}
                meetPoint={ride.meetPoint}
                route={safeRoute}
                height={260}
                interactive
                hideHint
                showDestination={safeRoute.length > 1}
                showWaypoints={
                  Array.isArray(ride.waypoints) && ride.waypoints.length > 0
                }
                waypoints={ride.waypoints ?? []}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                  Route map unavailable
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCell label="Meetup" value={ride.meetPoint} />
            <InfoCell label="Destination" value={ride.destination} />
            <InfoCell label="Distance" value={ride.distance} />
            <InfoCell label="Duration" value={ride.duration} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              About this ride
            </p>
            <p className="text-sm leading-6 text-zinc-300">{ride.description}</p>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Hosted by
            </p>
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10">
                <Image
                  src={ride.host.photo}
                  alt={ride.host.name}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <span className="text-sm text-zinc-200">{ride.host.name}</span>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Who&apos;s going &mdash; {ride.going.length} riders
            </p>

            <div className="flex flex-wrap gap-2">
              {ride.going.map((rider) => (
                <div key={rider.name} className="flex items-center gap-2">
                  <div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/10">
                    <Image
                      src={rider.photo}
                      alt={rider.name}
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs text-zinc-400">{rider.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Meet Chat
              </p>

              {!canUseChat && (
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  Join to message
                </span>
              )}
            </div>

            <div className="grid max-h-56 gap-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No messages yet. Start the meet conversation.
                </p>
              ) : (
                messages.map((message) => {
                  const senderName =
                    message.sender?.display_name?.trim() ||
                    message.sender?.full_name?.trim() ||
                    message.sender?.username?.trim() ||
                    "Crimson Member";

                  const senderPhoto =
                    message.sender?.profile_image_url ||
                    message.sender?.avatar_url ||
                    "/icon.png";
                  const canDelete =
                    message.user_id === currentUserId || ride.hostId === currentUserId;

                  if (message.kind === "system") {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="group flex max-w-[90%] items-center gap-2 rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-center">
                          <p className="text-[11px] leading-5 text-zinc-500">
                            {message.body}{" "}
                            <span className="text-zinc-700">
                              &middot; {formatMessageTime(message.created_at)}
                            </span>
                          </p>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void deleteMessage(message.id)}
                              disabled={deletingMessageIds.has(message.id)}
                              className="rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-zinc-700 transition hover:text-[#f4dadd] disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={message.id} className="flex gap-2">
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10">
                        <Image
                          src={senderPhoto}
                          alt={senderName}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 text-xs font-semibold text-zinc-200">
                            {senderName}{" "}
                            <span className="font-normal text-zinc-600">
                              &middot; {formatMessageTime(message.created_at)}
                            </span>
                          </p>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void deleteMessage(message.id)}
                              disabled={deletingMessageIds.has(message.id)}
                              className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-[#7f111b]/50 hover:text-[#f4dadd] disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm leading-5 text-zinc-400">
                          {message.body}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={
                  canUseChat ? "Message the meet..." : "Join the meet to message"
                }
                disabled={!canUseChat || sending}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
              />

              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!canUseChat || sending || !draft.trim()}
                className="rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/40 disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/8 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
          <Link
            href="/rides/track"
            onClick={() => {
              sessionStorage.setItem(
                "crimson-active-ride",
                JSON.stringify({
                  route: ride.route,
                  waypoints: ride.waypoints,
                  name: ride.name,
                  meetPoint: ride.meetPoint,
                  destination: ride.destination,
                })
              );
            }}
            className="mb-3 flex w-full items-center justify-center rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#7f111b]/40"
          >
            Start Ride Tracking
          </Link>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/15 bg-white/[0.03] py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200"
            >
              Close
            </button>

            <button
              onClick={() => {
                onJoin();
              }}
              disabled={isHost}
              className={`flex-1 rounded-lg border py-3 text-[10px] uppercase tracking-[0.2em] transition ${
                isGoing
                  ? "border-[#7f111b]/80 bg-[#7f111b]/30 text-[#f4dadd]"
                  : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#7f111b]/60 hover:bg-[#7f111b]/18"
              }`}
            >
              {isHost ? "Hosting" : isGoing ? "✓ Going" : "JOIN RIDE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="mb-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </p>
      <p className="text-xs font-medium text-zinc-300">{value}</p>
    </div>
  );
}
