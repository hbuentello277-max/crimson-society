"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { Meet, MeetTrackingStatus } from "@/lib/meets/types";
import { NavigateToMeetButton } from "@/components/meets/NavigateToMeetButton";
import { writeActiveMeetSession } from "@/lib/meets/active-meet-session";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import { meetNavigationHref } from "@/lib/meets/load-navigation-meet";
import { startMeetTracking, parseMeetTrackingLifecycleRow } from "@/lib/meets/meet-tracking";
import { deriveMeetLifecycle, meetLifecycleLabel } from "@/lib/meets/lifecycle";
import {
  ensureRouteWithSteps,
  hasRoadGeometry,
  needsRouteRepair,
  parseRoute,
} from "@/lib/meets/route-geometry";
import { useAuth } from "@/components/AuthProvider";
import { canSelfJoinMeet } from "@/lib/meet-privacy";
import { supabase } from "@/lib/supabase";

const MeetMap = dynamic(() => import("@/components/MeetMap"), { ssr: false });

type MeetAttendee = {
  userId: string;
  name: string;
  username: string | null;
  photo: string;
};

interface Props {
  meet: Meet;
  isGoing: boolean;
  isAdmin: boolean;
  scrollToChat?: boolean;
  onJoin: () => void;
  onRead: (meetId: string) => void;
  onClose: () => void;
  onMeetUpdated: (patch: Partial<Meet>) => void;
  onAttendeesChanged: (going: Meet["going"]) => void;
  onCancelMeet: () => void;
}

type RideMessage = {
  id: string;
  ride_id: string;
  user_id: string;
  body: string;
  kind: "message" | "system";
  media_url: string | null;
  media_type: string | null;
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
  media_url,
  media_type,
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

function profileHref(username?: string | null) {
  const clean = username?.trim().replace(/^@+/, "");
  return clean ? `/profile/${clean}` : null;
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

function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "meet-chat-photo";
}

const DEFAULT_RIDER_PHOTO = "/icon.png";

export function MeetDetailsModal({
  meet,
  isGoing,
  isAdmin,
  scrollToChat = false,
  onJoin,
  onRead,
  onClose,
  onMeetUpdated,
  onAttendeesChanged,
  onCancelMeet,
}: Props) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Unsafe riding or meet behavior");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [safetyMessage, setSafetyMessage] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<MeetAttendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [showRidersPanel, setShowRidersPanel] = useState(false);
  const [moderationBusy, setModerationBusy] = useState<string | null>(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatSectionRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resolvedRoute, setResolvedRoute] = useState(meet.route ?? []);

  const isHost = meet.hostId === currentUserId;
  const canModerate = isHost || isAdmin;
  const isCanceled = meet.status === "canceled";
  const inviteJoinBlocked =
    !canSelfJoinMeet({
      privacy: meet.privacy,
      hostId: meet.hostId,
      userId: currentUserId,
      isAdmin,
    }) && !isGoing;
  const isRideLive = meet.trackingStatus === "active";
  const canUseChat = (isGoing || isHost) && !isCanceled;

  useEffect(() => {
    let active = true;

    async function fetchMessage(messageId: string) {
      const { data, error } = await supabase
        .from(MEET_TABLES.messages)
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
      onRead(meet.id);
    }

    async function loadChat() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setCurrentUserId(user?.id ?? null);

      const { data, error } = await supabase
        .from(MEET_TABLES.messages)
        .select(RIDE_MESSAGE_SELECT)
        .eq("ride_id", meet.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load ride chat:", error);
        return;
      }

      if (active) {
        setMessages(normalizeMessages(data));
        onRead(meet.id);
      }
    }

    void loadChat();

    const channel = supabase
      .channel(`meet-chat-${meet.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_messages",
          filter: `ride_id=eq.${meet.id}`,
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
          filter: `ride_id=eq.${meet.id}`,
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
  }, [onRead, meet.id]);

  useEffect(() => {
    setResolvedRoute(meet.route ?? []);
  }, [meet.id, meet.route]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (scrollToChat) {
      chatSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }

    container.scrollTop = 0;
  }, [meet.id, scrollToChat]);

  useEffect(() => {
    if (!scrollToChat) return;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, scrollToChat]);

  useEffect(() => {
    let active = true;

    async function repairRoute() {
      const currentRoute = parseRoute(meet.route);
      if (!needsRouteRepair(currentRoute)) {
        if (active) setResolvedRoute(currentRoute);
        return;
      }

      const resolved = await ensureRouteWithSteps(
        {
          id: meet.id,
          host_id: meet.hostId ?? null,
          route: meet.route,
          meet_point_lat: meet.lat,
          meet_point_lng: meet.lng,
          destination_lat: meet.destinationLat ?? null,
          destination_lng: meet.destinationLng ?? null,
        },
        {
          persistUserId: currentUserId,
          persistAsAdmin: isAdmin,
        },
      );

      if (!active || !hasRoadGeometry(resolved.geometry)) return;

      setResolvedRoute(resolved.geometry);
      onMeetUpdated({ route: resolved.geometry });
    }

    void repairRoute();

    return () => {
      active = false;
    };
  }, [
    currentUserId,
    isAdmin,
    meet.destinationLat,
    meet.destinationLng,
    meet.hostId,
    meet.id,
    meet.lat,
    meet.lng,
    meet.route,
    onMeetUpdated,
  ]);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  const loadAttendees = useCallback(async () => {
    setLoadingAttendees(true);

    const { data, error } = await supabase
      .from(MEET_TABLES.attendees)
      .select(
        `
        user_id,
        profile:profiles!ride_attendees_user_id_fkey (
          id,
          username,
          display_name,
          full_name,
          profile_image_url,
          avatar_url
        )
      `
      )
      .eq("ride_id", meet.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load meet riders:", error);
      setLoadingAttendees(false);
      return;
    }

    const nextAttendees: MeetAttendee[] = [];
    const nextGoing: Meet["going"] = [];

    for (const row of data || []) {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      const name =
        profile?.display_name?.trim() ||
        profile?.full_name?.trim() ||
        profile?.username?.trim() ||
        "Crimson Member";
      const photo =
        profile?.profile_image_url || profile?.avatar_url || DEFAULT_RIDER_PHOTO;

      nextAttendees.push({
        userId: row.user_id,
        name,
        username: profile?.username ?? null,
        photo,
      });

      nextGoing.push({
        name,
        photo,
        username: profile?.username ?? null,
      });
    }

    setAttendees(nextAttendees);
    onAttendeesChanged(nextGoing);
    setLoadingAttendees(false);
  }, [onAttendeesChanged, meet.id]);

  useEffect(() => {
    if (!canModerate) return;
    void loadAttendees();
  }, [canModerate, loadAttendees]);

  useEffect(() => {
    if (showRidersPanel && canModerate) {
      void loadAttendees();
    }
  }, [canModerate, loadAttendees, showRidersPanel]);

  async function removeRider(userId: string) {
    if (!canModerate || moderationBusy) return;
    if (userId === meet.hostId) return;

    const confirmed = window.confirm("Remove this rider from the meet?");
    if (!confirmed) return;

    setModerationBusy(userId);

    const { error } = await supabase
      .from(MEET_TABLES.attendees)
      .delete()
      .eq("ride_id", meet.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to remove rider:", error);
      setSafetyMessage(error.message || "Could not remove rider.");
      setModerationBusy(null);
      return;
    }

    const nextAttendees = attendees.filter((attendee) => attendee.userId !== userId);
    setAttendees(nextAttendees);
    onAttendeesChanged(
      nextAttendees.map((attendee) => ({
        name: attendee.name,
        photo: attendee.photo,
        username: attendee.username,
      }))
    );

    setSafetyMessage("Rider removed.");
    window.setTimeout(() => setSafetyMessage(null), 2400);
    setModerationBusy(null);
  }

  async function endActiveRide() {
    if (!canModerate || !isRideLive || moderationBusy) return;

    const confirmed = window.confirm("End this ride now?");
    if (!confirmed) return;

    setModerationBusy("end");

    const endedAt = new Date().toISOString();
    let query = supabase
      .from(MEET_TABLES.meets)
      .update({
        tracking_status: "ended",
        ended_at: endedAt,
      })
      .eq("id", meet.id);

    if (!isAdmin) {
      query = query.eq("host_id", session?.user?.id ?? "");
    }

    const { error } = await query;

    if (error) {
      console.error("Failed to end ride:", error);
      setSafetyMessage(error.message || "Could not end meet.");
      setModerationBusy(null);
      return;
    }

    onMeetUpdated({
      trackingStatus: "ended" as MeetTrackingStatus,
      endedAt,
    });
    setSafetyMessage("Ride ended.");
    window.setTimeout(() => setSafetyMessage(null), 2400);
    setModerationBusy(null);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Choose an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("Images must be 8 MB or smaller.");
      return;
    }

    setSelectedImage(file);
  }

  async function uploadSelectedImage(file: File, userId: string) {
    const filePath = `${userId}/${meet.id}/${Date.now()}-${safeFileName(file.name)}`;

    const { error } = await supabase.storage.from("ride-chat-media").upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from("ride-chat-media").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function sendMessage() {
    const body = draft.trim();
    const image = selectedImage;
    if ((!body && !image) || sending || !currentUserId) return;

    setSending(true);

    try {
      const mediaUrl = image ? await uploadSelectedImage(image, currentUserId) : null;

      const { error } = await supabase.from(MEET_TABLES.messages).insert({
        ride_id: meet.id,
        user_id: currentUserId,
        body,
        media_url: mediaUrl,
        media_type: image?.type ?? null,
      });

      if (error) throw error;

      setDraft("");
      setSelectedImage(null);
    } catch (error) {
      console.error("Failed to send ride chat message:", error);
      alert("Could not send this meet message.");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(messageId: string) {
    if (!currentUserId) return;

    setDeletingMessageIds((current) => new Set(current).add(messageId));

    const { error } = await supabase
      .from(MEET_TABLES.messages)
      .delete()
      .eq("id", messageId)
      .eq("ride_id", meet.id);

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

  async function submitRideReport() {
    if (!currentUserId || reporting) return;

    setReporting(true);
    setSafetyMessage(null);

    const { error } = await supabase.from("user_reports").insert({
      reporter_id: currentUserId,
      reported_user_id: meet.hostId ?? null,
      ride_id: meet.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });

    if (error) {
      setSafetyMessage(error.message || "Could not submit report.");
    } else {
      setReportOpen(false);
      setReportDetails("");
      setSafetyMessage("Meet report submitted.");
      window.setTimeout(() => setSafetyMessage(null), 2600);
    }

    setReporting(false);
  }

  const safeRoute = hasRoadGeometry(resolvedRoute) ? resolvedRoute : [];
  const hasRoute = safeRoute.length > 0;

  async function handleStartMeetTracking() {
    if (!currentUserId || !isHost || trackingBusy || isCanceled) return;

    setTrackingBusy(true);
    const result = await startMeetTracking(meet.id, currentUserId);
    setTrackingBusy(false);

    if (!result.ok) {
      setSafetyMessage(result.error ?? "Could not start meet tracking.");
      window.setTimeout(() => setSafetyMessage(null), 3200);
      return;
    }

    const lifecycle = parseMeetTrackingLifecycleRow(result.row);
    onMeetUpdated({
      trackingStatus: lifecycle.trackingStatus,
      startedAt: lifecycle.startedAt,
      endedAt: lifecycle.endedAt,
    });
  }
  const trimmedDescription = meet.description?.trim() ?? "";
  const memberCountLabel =
    meet.going.length === 1 ? "1 member" : `${meet.going.length} members`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={meet.name}
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
            src={meet.cover}
            alt={meet.name}
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

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-200 backdrop-blur-sm">
              {meet.type}
            </span>

            {isCanceled && (
              <span className="rounded-full border border-zinc-500/50 bg-zinc-900/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-300 backdrop-blur-sm">
                Canceled
              </span>
            )}

            {isRideLive && !isCanceled && (
              <span className="rounded-full border border-[#b4141e]/60 bg-[#b4141e]/25 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#f4dadd] backdrop-blur-sm">
                Live
              </span>
            )}

            {meet.privacy === "Invite" && (
              <span className="rounded-full border border-[#b4141e]/60 bg-[#b4141e]/20 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#f4dadd]">
                Invite Only
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-4 right-12">
            <p className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              {meet.date} / {formatTime(meet.time)}
            </p>
            <h2 className="text-lg font-semibold leading-tight text-white">
              {meet.name}
            </h2>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="max-h-[60vh] overflow-y-auto px-5 pb-6 pt-5 sm:max-h-[50vh]"
        >
          <div
            className="mb-5 overflow-hidden rounded-lg border border-white/10"
            style={{ height: 260, touchAction: "none" }}
          >
            {hasRoute ? (
              <MeetMap
                lat={meet.lat}
                lng={meet.lng}
                meetPoint={meet.meetPoint}
                route={safeRoute}
                height={260}
                interactive
                hideHint
                showDestination={safeRoute.length > 1}
                showWaypoints={
                  Array.isArray(meet.waypoints) && meet.waypoints.length > 0
                }
                waypoints={meet.waypoints ?? []}
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
            <InfoCell label="Meetup" value={meet.meetPoint} />
            <InfoCell label="Destination" value={meet.destination} />
            <InfoCell label="Distance" value={meet.distance} />
            <InfoCell label="Duration" value={meet.duration} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              About this meet
            </p>
            {trimmedDescription ? (
              <p className="text-sm leading-6 text-zinc-300">{trimmedDescription}</p>
            ) : (
              <p className="text-sm leading-6 text-zinc-400">
                {meet.meetPoint} to {meet.destination}
                {meet.distance !== "TBD" ? ` · ${meet.distance}` : ""}
                {meet.duration !== "TBD" ? ` · ${meet.duration}` : ""}
              </p>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Hosted by
            </p>
            {profileHref(meet.host.username) ? (
              <Link href={profileHref(meet.host.username)!} className="flex items-center gap-3">
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10">
                  <Image
                    src={meet.host.photo}
                    alt={meet.host.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <span className="text-sm text-zinc-200 transition hover:text-[#f4dadd]">{meet.host.name}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10">
                  <Image
                    src={meet.host.photo}
                    alt={meet.host.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <span className="text-sm text-zinc-200">{meet.host.name}</span>
              </div>
            )}
          </div>

          {isCanceled && (
            <div className="mt-5 rounded-lg border border-zinc-600/40 bg-zinc-900/40 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                Meet canceled
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                This meet was canceled. New riders cannot join, but the meet record is
                preserved for attendees.
              </p>
            </div>
          )}

          {canModerate && (
            <div className="mt-5 rounded-lg border border-[#b4141e]/35 bg-[#b4141e]/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#f0c9ce]">
                Host Controls
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowRidersPanel((open) => !open)}
                  className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-200 transition hover:border-white/30"
                >
                  {showRidersPanel ? "Hide Riders" : "View Riders"}
                </button>

                {!isCanceled && (
                  <button
                    type="button"
                    onClick={onCancelMeet}
                    disabled={!!moderationBusy}
                    className="rounded-lg border border-[#b4141e]/60 bg-[#b4141e]/20 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f0c9ce] transition hover:bg-[#b4141e]/32 disabled:opacity-50"
                  >
                    Cancel Meet
                  </button>
                )}

                {isRideLive && !isCanceled && (
                  <button
                    type="button"
                    onClick={() => void endActiveRide()}
                    disabled={!!moderationBusy}
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-200 transition hover:border-white/30 disabled:opacity-50"
                  >
                    End Ride
                  </button>
                )}
              </div>

              {showRidersPanel && (
                <div className="mt-4">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Riders ({attendees.length})
                  </p>

                  {loadingAttendees ? (
                    <p className="text-sm text-zinc-500">Loading riders...</p>
                  ) : attendees.length === 0 ? (
                    <p className="text-sm text-zinc-500">No riders yet.</p>
                  ) : (
                    <div className="grid gap-2">
                      {attendees.map((attendee) => {
                        const href = profileHref(attendee.username);
                        const isMeetHost = attendee.userId === meet.hostId;

                        return (
                          <div
                            key={attendee.userId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10">
                                <Image
                                  src={attendee.photo}
                                  alt={attendee.name}
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                {href ? (
                                  <Link
                                    href={href}
                                    className="block truncate text-sm font-medium text-zinc-100 transition hover:text-[#f4dadd]"
                                  >
                                    {attendee.name}
                                  </Link>
                                ) : (
                                  <p className="truncate text-sm font-medium text-zinc-100">
                                    {attendee.name}
                                  </p>
                                )}
                                <p className="truncate text-xs text-zinc-500">
                                  {attendee.username
                                    ? `@${attendee.username.replace(/^@+/, "")}`
                                    : "No username"}
                                  {isMeetHost ? " / Host" : ""}
                                </p>
                              </div>
                            </div>

                            {!isMeetHost && (
                              <button
                                type="button"
                                onClick={() => void removeRider(attendee.userId)}
                                disabled={moderationBusy === attendee.userId}
                                className="shrink-0 rounded-md border border-[#b4141e]/50 bg-[#b4141e]/15 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.14em] text-[#f0c9ce] transition hover:bg-[#b4141e]/28 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Attending &mdash; {memberCountLabel}
            </p>

            <div className="flex flex-wrap gap-2">
              {meet.going.map((rider) => {
                const href = profileHref(rider.username);
                const content = (
                  <>
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
                  </>
                );

                return href ? (
                  <Link key={`${rider.username}-${rider.name}`} href={href} className="flex items-center gap-2 transition hover:text-[#f4dadd]">
                    {content}
                  </Link>
                ) : (
                  <div key={rider.name} className="flex items-center gap-2">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={chatSectionRef}
            className="mt-6 rounded-lg border border-white/10 bg-white/[0.025] p-4"
          >
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
	                    message.user_id === currentUserId || meet.hostId === currentUserId;
                    const senderHref = profileHref(message.sender?.username);

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
	                      <Link
                          href={senderHref || "#"}
                          aria-disabled={!senderHref}
                          className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10"
                          onClick={(event) => {
                            if (!senderHref) event.preventDefault();
                          }}
                        >
	                        <Image
	                          src={senderPhoto}
	                          alt={senderName}
                          fill
                          sizes="28px"
	                          className="object-cover"
	                        />
	                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
	                          <p className="min-w-0 text-xs font-semibold text-zinc-200">
	                            {senderHref ? (
                                <Link href={senderHref} className="transition hover:text-[#f4dadd]">
                                  {senderName}
                                </Link>
                              ) : (
                                senderName
                              )}{" "}
                            <span className="font-normal text-zinc-600">
                              &middot; {formatMessageTime(message.created_at)}
                            </span>
                          </p>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void deleteMessage(message.id)}
                              disabled={deletingMessageIds.has(message.id)}
                              className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-[#b4141e]/50 hover:text-[#f4dadd] disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        {message.media_url && (
                          <a
                            href={message.media_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 block overflow-hidden rounded-lg border border-white/10 bg-black/20"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={message.media_url}
                              alt={message.body || "Meet chat photo"}
                              className="max-h-64 w-full object-cover"
                            />
                          </a>
                        )}
                        {message.body && (
                          <p className="mt-0.5 text-sm leading-5 text-zinc-400">
                            {message.body}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {imagePreviewUrl && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Selected meet chat upload"
                  className="h-12 w-12 rounded-md object-cover"
                />
                <p className="min-w-0 flex-1 truncate text-xs text-zinc-400">
                  {selectedImage?.name}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  disabled={sending}
                  className="rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-200 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={!canUseChat || sending}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canUseChat || sending}
                aria-label="Attach image"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-zinc-400 transition hover:border-white/25 hover:text-zinc-200 disabled:text-zinc-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
                  <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9z" />
                  <path d="m7 15 3-3 2.5 2.5L14 13l3 3" />
                  <circle cx="15.5" cy="9" r="1.25" />
                </svg>
              </button>
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
                disabled={!canUseChat || sending || (!draft.trim() && !selectedImage)}
                className="rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#b4141e]/40 disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
              >
                {sending ? "Sending" : "Send"}
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/8 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
          <NavigateToMeetButton
            target={{ lat: meet.lat, lng: meet.lng, label: meet.meetPoint }}
            className="mb-3 flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-100 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
          />

          {isHost && !isRideLive && !isCanceled && hasRoute ? (
            <button
              type="button"
              onClick={() => void handleStartMeetTracking()}
              disabled={trackingBusy}
              className="mb-3 flex w-full items-center justify-center rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#b4141e]/40 disabled:opacity-60"
            >
              {trackingBusy ? "Starting…" : "Start Meet"}
            </button>
          ) : null}

          {hasRoute ? (
            <Link
              href={meetNavigationHref(meet.id)}
              onClick={() => {
                writeActiveMeetSession({
                  id: meet.id,
                  hostId: meet.hostId ?? null,
                  route: safeRoute,
                  waypoints: meet.waypoints ?? [],
                  name: meet.name,
                  meetPoint: meet.meetPoint,
                  destination: meet.destination,
                  date: meet.date ?? null,
                  time: meet.time ?? null,
                  meetDurationMinutes: meet.meetDurationMinutes ?? null,
                  status: meet.status ?? "active",
                  trackingStatus: meet.trackingStatus ?? "not_started",
                  startedAt: meet.startedAt ?? null,
                  endedAt: meet.endedAt ?? null,
                });
              }}
              className="mb-3 flex w-full items-center justify-center rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#b4141e]/40"
            >
              Start Ride
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            disabled={!currentUserId}
            className="mb-3 flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition hover:border-[#b4141e]/50 hover:text-[#f4dadd] disabled:opacity-50"
          >
            Report Meet
          </button>

          {inviteJoinBlocked && (
            <p className="mb-3 text-center text-xs leading-5 text-zinc-500">
              Invite-only meet. Ask the host for access.
            </p>
          )}

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
              disabled={isHost || isCanceled || inviteJoinBlocked}
              className={`flex-1 rounded-lg border py-3 text-[10px] uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-55 ${
                isCanceled
                  ? "border-white/10 bg-white/[0.02] text-zinc-600"
                  : inviteJoinBlocked
                    ? "border-white/10 bg-white/[0.02] text-zinc-600"
                    : isGoing
                      ? "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
                      : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#b4141e]/60 hover:bg-[#b4141e]/18"
              }`}
            >
              {isCanceled
                ? "Canceled"
                : isHost
                  ? "Hosting"
                  : isGoing
                    ? "✓ Going"
                    : inviteJoinBlocked
                      ? "Invite Only"
                      : "JOIN MEET"}
            </button>
          </div>
        </div>

        {reportOpen && (
          <div className="absolute inset-0 z-20 flex items-end bg-black/80 p-4 backdrop-blur-sm sm:items-center">
            <div className="w-full rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#f4dadd]">Report Meet</p>
                  <h3 className="mt-2 font-serif text-2xl text-white">{meet.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400"
                >
                  Close
                </button>
              </div>

              <label className="mt-5 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Reason
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none"
                >
                  <option className="bg-black" value="Unsafe riding or meet behavior">Unsafe riding or meet behavior</option>
                  <option className="bg-black" value="Harassment or abuse">Harassment or abuse</option>
                  <option className="bg-black" value="Spam or scam">Spam or scam</option>
                  <option className="bg-black" value="False or misleading meet">False or misleading meet</option>
                  <option className="bg-black" value="Other">Other</option>
                </select>
              </label>

              <label className="mt-4 block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Details
                <textarea
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Optional context for moderators"
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-zinc-600"
                />
              </label>

              <button
                type="button"
                onClick={() => void submitRideReport()}
                disabled={reporting}
                className="mt-5 w-full rounded-xl border border-[#b4141e]/70 bg-[#b4141e]/25 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#b4141e]/40 disabled:opacity-60"
              >
                {reporting ? "Submitting" : "Submit Report"}
              </button>
            </div>
          </div>
        )}

        {safetyMessage && (
          <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#b4141e]/50 bg-[#0a0a0b]/95 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f4dadd] shadow-2xl">
            {safetyMessage}
          </div>
        )}
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
