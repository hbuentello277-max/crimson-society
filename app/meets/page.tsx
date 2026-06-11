"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import { canSelfJoinMeet, canViewMeetForUser, getMeetJoinBlockMessage } from "@/lib/meet-privacy";
import { hasBlackcardAccess, type MembershipRow } from "@/lib/membership";
import {
  meetVisibilityLabel,
  type MeetVisibility,
} from "@/lib/meet-visibility";
import { supabase } from "@/lib/supabase";
import { MeetDetailsModal } from "@/components/meets/MeetDetailsModal";
import { HostMeetModal } from "@/components/meets/HostMeetModal";
import type { HostMeetForm } from "@/components/meets/HostMeetModal";
import {
  createMeetIdempotencyKey,
  isMeetCreateDuplicateError,
} from "@/lib/meets/create-meet-idempotency";
import { dedupeMeetsById } from "@/lib/meets/dedupe-meets";
import { formatRouteDurationLabel } from "@/lib/meets/format-route-duration";
import { buildSnappedRoute } from "@/lib/routing";
import {
  buildNavigationStepsFromSnapped,
  serializeRouteSteps,
} from "@/lib/meets/navigation/steps";
import { SwipeTabPanels } from "@/components/ui/SwipeTabPanels";
import { BOTTOM_NAV_CLEARANCE, CS_BADGE_SM, CS_HOST_MEET_BTN, csPill } from "@/lib/crimson-accent";
import { useHistoryModal } from "@/hooks/useHistoryModal";
import { blackcardLeaderboardHref } from "@/lib/navigation/meets-return";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import {
  deriveMeetLifecycle,
  groupMeetsByLifecycle,
  meetLifecycleLabel,
  parseMeetStatus,
  type MeetLifecyclePhase,
} from "@/lib/meets/lifecycle";
import type {
  Meet,
  MeetAttendee,
  MeetPrivacy,
  MeetRow,
  MeetStatus,
  MeetTrackingStatus,
  MeetType,
  RoutePoint,
} from "@/lib/meets/types";
import { leaveMeetAttendance } from "@/lib/meets/leave-meet";
import { profileToMeetAttendee } from "@/lib/meets/map-profile-attendee";
import { isMeetHostOrCoHost, isPrimaryMeetHost } from "@/lib/meets/permissions";
import { mapMeetRowToMeet } from "@/lib/meets/meet-row-mapper";
import {
  hasRoadGeometry,
  parseRoute,
  endpointRouteFromRow,
  ensureRouteWithSteps,
} from "@/lib/meets/route-geometry";

type MeetReadRow = { ride_id: string; last_read_at: string };
type MeetUnreadMessageRow = { ride_id: string; user_id: string; created_at: string };
type AttendeeRow = { ride_id: string; user_id: string };

const DEFAULT_COVER = "/icon-512.png";
const DEFAULT_HOST_PHOTO = "/icon-192.png";
const ACTIVE_MEETS_LIMIT = 50;

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

function profileHref(username?: string | null) {
  const clean = username?.trim().replace(/^@+/, "");
  return clean ? `/profile/${clean}` : null;
}

function meetRowToMeet(row: MeetRow, resolvedRoute?: RoutePoint[]): Meet {
  return mapMeetRowToMeet(row, resolvedRoute);
}

function meetToForm(ride: Meet): HostMeetForm {
  return {
    cover: ride.cover,
    name: ride.name,
    date: ride.date,
    time: ride.time,
    meetPoint: ride.meetPoint,
    meetPointLat: ride.lat,
    meetPointLng: ride.lng,
    destination: ride.destination,
    destinationLat: ride.destinationLat ?? null,
    destinationLng: ride.destinationLng ?? null,
    distance: ride.distance === "TBD" ? "" : ride.distance,
    duration: ride.duration === "TBD" ? "" : ride.duration,
    type: ride.type,
    privacy: ride.privacy,
    visibility: ride.visibility,
    description: ride.description,
  };
}

function MeetCard({
  ride,
  isGoing,
  canManage,
  canModerate,
  unreadCount,
  isLocked,
  lockMessage,
  joinBlocked,
  onJoin,
  onLeave,
  onViewDetails,
  onEdit,
  onCancel,
  isHostTeam,
}: {
  ride: Meet;
  isGoing: boolean;
  canManage: boolean;
  canModerate: boolean;
  isHostTeam: boolean;
  unreadCount: number;
  isLocked?: boolean;
  lockMessage?: string | null;
  joinBlocked?: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const isCanceled = ride.status === "canceled";
  const inviteJoinBlocked = joinBlocked ?? (ride.privacy === "Invite" && !canModerate && !isGoing);

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]">
      <div className="grid gap-0 sm:grid-cols-[144px_1fr]">
        <div className="relative h-40 sm:h-full">
          <Image
            src={ride.cover}
            alt={ride.name}
            fill
            sizes="(max-width: 640px) 100vw, 144px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050405] via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/45 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-zinc-100 backdrop-blur-md">
            {ride.type}
          </span>
          {isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-4 text-center backdrop-blur-sm">
              <span className="text-2xl">🔒</span>
              <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]">
                {meetVisibilityLabel(ride.visibility)}
              </p>
              {lockMessage ? (
                <p className="mt-2 text-xs leading-5 text-zinc-300">{lockMessage}</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#d85f6c]">
                {ride.date} / {formatTime(ride.time)}
              </p>
              <h3 className="mt-2 font-serif text-[26px] leading-none text-[#f4f0ea]">
                {ride.name}
              </h3>
              <p className="mt-2 text-sm text-zinc-400">{ride.city}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {unreadCount > 0 && (
                <span className="rounded-md border border-[#b4141e]/80 bg-[#b4141e]/35 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#f4dadd] shadow-[0_0_24px_-12px_rgba(216,95,108,0.9)]">
                  {unreadCount} new
                </span>
              )}

              {(ride.visibility === "invite" || ride.privacy === "Invite") && (
                <span className="rounded-md border border-[#b4141e]/45 bg-[#b4141e]/18 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[#f0c9ce]">
                  Invite
                </span>
              )}

              {ride.visibility === "blackcard" && (
                <span className="rounded-md border border-white/20 bg-black/55 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-zinc-100">
                  Blackcard
                </span>
              )}

              {isCanceled && (
                <span className="rounded-md border border-zinc-600/60 bg-zinc-800/50 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-zinc-300">
                  Canceled
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-300">
            <span>{ride.meetPoint}</span>
            <span className="text-zinc-700">/</span>
            <span>{ride.distance}</span>
            <span className="text-zinc-700">/</span>
            <span>{ride.duration}</span>
          </div>

          {ride.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
              {ride.description}
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3">
           <div className="flex items-center gap-2">
	  <div className="flex -space-x-2">
	    {ride.going.slice(0, 4).map((rider) => {
        const href = profileHref(rider.username);
        const avatar = (
          <div className="relative h-7 w-7 overflow-hidden rounded-full border border-[#050405] bg-zinc-900">
            <Image
              src={rider.photo}
              alt={rider.name}
              fill
              sizes="28px"
              className="object-cover"
            />
          </div>
        );

        return href ? (
          <Link key={`${rider.username}-${rider.name}`} href={href} className="transition hover:scale-105">
            {avatar}
          </Link>
        ) : (
          <div key={rider.name}>{avatar}</div>
        );
      })}
	  </div>

  <span className="text-xs text-zinc-500">
    {ride.going.length} going
  </span>
</div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onViewDetails}
                className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
              >
                View Route
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
                >
                  Edit
                </button>
              )}

              {canManage && !isCanceled && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg border border-[#b4141e]/60 bg-[#b4141e]/18 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0c9ce] transition hover:bg-[#b4141e]/28"
                >
                  Cancel
                </button>
              )}

              {isHostTeam ? (
                <span className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0c9ce]">
                  {canManage ? "Hosting" : "Co-hosting"}
                </span>
              ) : isGoing ? (
                <button
                  type="button"
                  onClick={onLeave}
                  disabled={isCanceled}
                  className="rounded-lg border border-[#b4141e]/50 bg-transparent px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#e87a82] transition hover:bg-[#b4141e]/10 disabled:opacity-55"
                >
                  Leave Meet
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onJoin}
                  disabled={isCanceled || inviteJoinBlocked}
                  className={`rounded-lg border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    inviteJoinBlocked
                      ? "border-white/10 bg-white/[0.02] text-zinc-600"
                      : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#b4141e]/60 hover:bg-[#b4141e]/16"
                  }`}
                >
                  {inviteJoinBlocked ? "Invite Only" : "Join Meet"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function MeetsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading, isAdmin } = useAuth();
  const [viewerHasBlackcard, setViewerHasBlackcard] = useState(false);
  const [followingHostIds, setFollowingHostIds] = useState<Set<string>>(new Set());
  const [favoritedHostIds, setFavoritedHostIds] = useState<Set<string>>(new Set());
  const [going, setGoing] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [selectedMeet, setSelectedMeet] = useState<Meet | null>(null);
  const [realMeets, setRealMeets] = useState<Meet[]>([]);
  const [showHostModal, setShowHostModal] = useState(false);
  const [editingMeet, setEditingMeet] = useState<Meet | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loadingMeets, setLoadingMeets] = useState(true);
  const selectedMeetRef = useRef<Meet | null>(null);
  const openedMeetParamRef = useRef<string | null>(null);
  const saveMeetInFlightRef = useRef(false);
  const createMeetIdempotencyKeyRef = useRef<string | null>(null);
  const [savingMeet, setSavingMeet] = useState(false);
  const meetParam = searchParams.get("meet");
  const meetSectionParam = searchParams.get("section");

  const [lifecycleTab, setLifecycleTab] = useState<"upcoming" | "active" | "past">("upcoming");
  const [now, setNow] = useState(Date.now());
  const hostModalOpen = showHostModal || Boolean(editingMeet);

  const closeHostModal = useCallback(() => {
    setShowHostModal(false);
    setEditingMeet(null);
    createMeetIdempotencyKeyRef.current = null;
  }, []);

  const { closeWithHistory: closeHostModalWithHistory } = useHistoryModal(
    hostModalOpen,
    closeHostModal,
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const { upcomingMeets, activeMeets, pastMeets } = useMemo(() => {
    const upcoming: Meet[] = [];
    const active: Meet[] = [];
    const past: Meet[] = [];

    for (const meet of realMeets) {
      const phase = deriveMeetLifecycle({
        status: meet.status,
        trackingStatus: meet.trackingStatus,
        date: meet.date,
        time: meet.time,
        meetDurationMinutes: meet.meetDurationMinutes,
        now,
      });

      if (phase === "upcoming") upcoming.push(meet);
      else if (phase === "active") active.push(meet);
      else past.push(meet);
    }

    return { upcomingMeets: upcoming, activeMeets: active, pastMeets: past };
  }, [realMeets, now]);

  useEffect(() => {
    selectedMeetRef.current = selectedMeet;
  }, [selectedMeet]);

  const loadUnreadCounts = useCallback(
    async (rideIds: string[]) => {
      const userId = session?.user?.id;
      const uniqueRideIds = Array.from(new Set(rideIds.filter(Boolean)));

      if (!userId || uniqueRideIds.length === 0) {
        setUnreadCounts({});
        return;
      }

      const [
        { data: readRows, error: readsError },
        { data: messageRows, error: messagesError },
      ] = await Promise.all([
        supabase
          .from(MEET_TABLES.messageReads)
          .select("ride_id, last_read_at")
          .eq("user_id", userId)
          .in("ride_id", uniqueRideIds),
        supabase
          .from(MEET_TABLES.messages)
          .select("ride_id, user_id, created_at")
          .in("ride_id", uniqueRideIds),
      ]);

      if (readsError) {
        console.error("Failed to load meet read markers:", readsError);
      }

      if (messagesError) {
        console.error("Failed to load meet unread counts:", messagesError);
        return;
      }

      const readMap = new Map(
        ((readRows || []) as MeetReadRow[]).map((row) => [row.ride_id, row.last_read_at])
      );
      const nextCounts = Object.fromEntries(uniqueRideIds.map((rideId) => [rideId, 0]));

      for (const message of (messageRows || []) as MeetUnreadMessageRow[]) {
        if (message.user_id === userId) continue;

        const lastReadAt = readMap.get(message.ride_id);
        if (!lastReadAt || message.created_at > lastReadAt) {
          nextCounts[message.ride_id] = (nextCounts[message.ride_id] || 0) + 1;
        }
      }

      setUnreadCounts((current) => ({
        ...current,
        ...nextCounts,
      }));
    },
    [session?.user?.id]
  );

  const markMeetRead = useCallback(
    async (rideId: string) => {
      const userId = session?.user?.id;
      if (!userId) return;

      setUnreadCounts((current) => ({
        ...current,
        [rideId]: 0,
      }));

      window.dispatchEvent(
        new CustomEvent("crimson-meet-chat-read", {
          detail: { rideId },
        })
      );

      const { error } = await supabase.from(MEET_TABLES.messageReads).upsert(
        {
          ride_id: rideId,
          user_id: userId,
          last_read_at: new Date().toISOString(),
        },
        {
          onConflict: "ride_id,user_id",
        }
      );

      if (error) {
        console.error("Failed to mark meet chat read:", error);
      }
    },
    [session?.user?.id]
  );

  function openMeetDetails(ride: Meet) {
    setSelectedMeet(ride);
    void markMeetRead(ride.id);
  }

  useEffect(() => {
    if (!meetParam || loadingMeets || openedMeetParamRef.current === meetParam) return;

    const ride = realMeets.find((meet) => meet.id === meetParam);
    if (!ride) return;

    const phase = deriveMeetLifecycle({
      status: ride.status,
      trackingStatus: ride.trackingStatus,
      date: ride.date,
      time: ride.time,
      meetDurationMinutes: ride.meetDurationMinutes,
    });
    setLifecycleTab(phase === "active" ? "active" : phase === "past" || phase === "canceled" ? "past" : "upcoming");
    openedMeetParamRef.current = meetParam;
    setSelectedMeet(ride);
    void markMeetRead(ride.id);
  }, [loadingMeets, markMeetRead, meetParam, realMeets]);

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
  }, [authLoading, session, router]);

  useEffect(() => {
    if (authLoading || !session?.user?.id) return;

    let active = true;

    async function loadMeets() {
      setLoadingMeets(true);
      const userId = session?.user?.id;

      const [
        { data: activeData, error: activeError },
        { data: canceledHostedData, error: canceledHostedError },
      ] = await Promise.all([
        supabase
          .from(MEET_TABLES.meets)
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(ACTIVE_MEETS_LIMIT),
        userId
          ? supabase
              .from(MEET_TABLES.meets)
              .select("*")
              .eq("status", "canceled")
              .eq("host_id", userId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as MeetRow[], error: null }),
      ]);

      const error = activeError || canceledHostedError;

      if (error) {
        console.error("Failed to load meets:", error);
        if (active) {
          setToast(error.message || "Could not load meets.");
          window.setTimeout(() => setToast(null), 2200);
          setLoadingMeets(false);
        }
        return;
      }

      let canceledAttendeeRows: MeetRow[] = [];
      if (userId) {
        const { data: attendanceRows } = await supabase
          .from(MEET_TABLES.attendees)
          .select("ride_id")
          .eq("user_id", userId);

        const attendedRideIds = Array.from(
          new Set((attendanceRows || []).map((row) => row.ride_id).filter(Boolean))
        );

        if (attendedRideIds.length > 0) {
          const { data: canceledAttendeeData, error: canceledAttendeeError } = await supabase
            .from(MEET_TABLES.meets)
            .select("*")
            .eq("status", "canceled")
            .in("id", attendedRideIds)
            .order("created_at", { ascending: false });

          if (canceledAttendeeError) {
            console.error("Failed to load canceled meets:", canceledAttendeeError);
          } else {
            canceledAttendeeRows = (canceledAttendeeData || []) as MeetRow[];
          }
        }
      }

      const rowMap = new Map<string, MeetRow>();
      for (const row of [
        ...((activeData || []) as MeetRow[]),
        ...((canceledHostedData || []) as MeetRow[]),
        ...canceledAttendeeRows,
      ]) {
        rowMap.set(row.id, row);
      }

      const rows = Array.from(rowMap.values()).sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      const rideIds = rows.map((row) => row.id);

      void loadUnreadCounts(rideIds);

      if (rideIds.length === 0) {
        if (active) {
          setGoing({});
          setRealMeets([]);
          setLoadingMeets(false);
        }
        return;
      }

const { data: attendanceRows, error: attendanceError } = await supabase
  .from(MEET_TABLES.attendees)
  .select("ride_id, user_id")
  .in("ride_id", rideIds);

  const typedAttendanceRows = (attendanceRows || []) as AttendeeRow[];

if (attendanceError) {
  console.error("Failed to load ride attendees:", attendanceError);
}

const nextGoing: Record<string, boolean> = {};
for (const attendee of typedAttendanceRows) {
  if (attendee.user_id === session?.user?.id) {
    nextGoing[attendee.ride_id] = true;
  }
}

if (active) {
  setGoing(nextGoing);
}

      const profileIds = Array.from(
  new Set([
    ...rows.map((row) => row.host_id),
    ...rows.map((row) => row.co_host_id),
    ...typedAttendanceRows.map((row) => row.user_id),
  ].filter(Boolean))
);

      const { data: profiles, error: profilesError } = await supabase
      .from("public_profiles")
      .select("id, username, display_name, full_name, profile_image_url, avatar_url")
      .in("id", profileIds);

      if (profilesError) {
        console.error("Failed to load ride host profiles:", profilesError);
}

      const profileMap = new Map(
        (profiles || []).map((profile) => [profile.id, profile])
);

     const attendeesByRide = new Map<string, MeetAttendee[]>();

for (const attendee of typedAttendanceRows) {
  const profile = profileMap.get(attendee.user_id);

  const rider: MeetAttendee = profile
    ? {
        name:
          profile.display_name?.trim() ||
          profile.full_name?.trim() ||
          profile.username?.trim() ||
          "Crimson Member",
        photo: profile.profile_image_url || profile.avatar_url || DEFAULT_HOST_PHOTO,
        username: profile.username,
      }
    : {
        name: "Crimson Member",
        photo: DEFAULT_HOST_PHOTO,
        username: null,
      };

  const current = attendeesByRide.get(attendee.ride_id) || [];
  attendeesByRide.set(attendee.ride_id, [...current, rider]);
}

const rowsWithHosts = rows.map((row) => ({
  ...row,
  host: profileMap.get(row.host_id) || null,
  coHost: row.co_host_id ? profileMap.get(row.co_host_id) || null : null,
  attendeeRiders: attendeesByRide.get(row.id) || [],
}));

const ridesWithRoutes = await Promise.all(
  rowsWithHosts.map(async (row) => {
    const savedRoute = parseRoute(row.route);
    if (hasRoadGeometry(savedRoute)) {
      return meetRowToMeet(row as MeetRow, savedRoute);
    }

    if (endpointRouteFromRow(row as MeetRow).length < 2) {
      return meetRowToMeet(row as MeetRow, []);
    }

    const resolved = await ensureRouteWithSteps(row as MeetRow, {
      persistUserId: session?.user?.id ?? null,
      persistAsAdmin: isAdmin,
    });
    return meetRowToMeet(row as MeetRow, resolved.geometry);
  }),
);

      if (active) {
        setRealMeets(dedupeMeetsById(ridesWithRoutes));
        setLoadingMeets(false);
      }
      
      
}

    void loadMeets();

    return () => {
      active = false;
    };
  }, [authLoading, isAdmin, loadUnreadCounts, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (authLoading || !userId) return;

    const channel = supabase
      .channel(`ride-message-badges-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_messages",
        },
        (payload) => {
          const message = payload.new as Partial<MeetUnreadMessageRow>;
          if (!message.ride_id || !message.user_id || message.user_id === userId) return;

          if (selectedMeetRef.current?.id === message.ride_id) {
            void markMeetRead(message.ride_id);
            return;
          }

          setUnreadCounts((current) => ({
            ...current,
            [message.ride_id as string]: (current[message.ride_id as string] || 0) + 1,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ride_messages",
        },
        (payload) => {
          const message = payload.old as Partial<MeetUnreadMessageRow>;
          if (message.ride_id) void loadUnreadCounts([message.ride_id]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authLoading, loadUnreadCounts, markMeetRead, session?.user?.id]);

  async function joinMeet(rideId: string) {
    if (!session?.user?.id) {
      setToast("You must be signed in to join a meet.");
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    const ride = realMeets.find((meet) => meet.id === rideId);
    if (ride && isMeetHostOrCoHost({ hostId: ride.hostId, coHostId: ride.coHostId }, session.user.id)) {
      setToast("You are hosting this meet.");
      window.setTimeout(() => setToast(null), 2000);
      return;
    }

    if (ride?.status === "canceled") {
      setToast("This meet was canceled.");
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    if (ride && meetJoinBlocked(ride, false)) {
      setToast(
        getMeetJoinBlockMessage({
          privacy: ride.privacy,
          visibility: ride.visibility,
          hasBlackcardAccess: viewerHasBlackcard,
          viewerFollowsHost: ride.hostId ? followingHostIds.has(ride.hostId) : false,
          viewerFavoritedHost: ride.hostId ? favoritedHostIds.has(ride.hostId) : false,
        }),
      );
      window.setTimeout(() => setToast(null), 2800);
      return;
    }

    const { error } = await supabase
      .from(MEET_TABLES.attendees)
      .upsert(
        {
          ride_id: rideId,
          user_id: session.user.id,
          status: "going",
        },
        {
          onConflict: "ride_id,user_id",
        },
      );

    if (error) {
      console.error("Failed to join meet:", error);
      setToast(
        ride?.privacy === "Invite"
          ? "Invite-only meet. Ask the host for access."
          : "Could not join meet.",
      );
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    const { error: activityError } = await supabase.rpc("log_ride_attendance_activity", {
      target_ride_id: rideId,
      activity: "joined",
    });

    if (activityError) {
      console.error("Failed to log meet join activity:", activityError);
    }

    setGoing((current) => ({
      ...current,
      [rideId]: true,
    }));

    setToast("Meet joined.");
    window.setTimeout(() => setToast(null), 2000);
  }

  async function refreshMeetAttendees(rideId: string) {
    const { data, error } = await supabase
      .from(MEET_TABLES.attendees)
      .select(
        `
        user_id,
        profile:profiles!ride_attendees_user_id_fkey (
          username,
          display_name,
          full_name,
          profile_image_url,
          avatar_url
        )
      `,
      )
      .eq("ride_id", rideId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to refresh meet attendees:", error);
      return null;
    }

    const nextGoing = (data || []).map((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      return profileToMeetAttendee(profile);
    });

    setRealMeets((current) =>
      current.map((meet) => (meet.id === rideId ? { ...meet, going: nextGoing } : meet)),
    );
    setSelectedMeet((current) =>
      current?.id === rideId ? { ...current, going: nextGoing } : current,
    );

    return nextGoing;
  }

  async function leaveMeet(rideId: string) {
    if (!session?.user?.id) {
      setToast("You must be signed in to leave a meet.");
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    const result = await leaveMeetAttendance(rideId, session.user.id);
    if (!result.ok) {
      setToast(result.error);
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    setGoing((current) => ({
      ...current,
      [rideId]: false,
    }));

    await refreshMeetAttendees(rideId);
    setToast("Meet left.");
    window.setTimeout(() => setToast(null), 2000);
  }

  function applyMeetPatch(rideId: string, patch: Partial<Meet>) {
    setRealMeets((current) =>
      current.map((ride) => (ride.id === rideId ? { ...ride, ...patch } : ride))
    );
    setSelectedMeet((current) =>
      current?.id === rideId ? { ...current, ...patch } : current
    );
  }

  async function cancelMeet(rideId: string) {
    const confirmed = window.confirm("Cancel this meet for all attendees?");
    if (!confirmed) return;

    if (!session?.user?.id) {
      setToast("You must be signed in to cancel a meet.");
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    const endedAt = new Date().toISOString();
    let query = supabase
      .from(MEET_TABLES.meets)
      .update({
        status: "canceled",
        tracking_status: "ended",
        ended_at: endedAt,
      })
      .eq("id", rideId);

    if (!isAdmin) {
      query = query.eq("host_id", session.user.id);
    }

    const { error } = await query;

    if (error) {
      console.error("Failed to cancel meet:", error);
      setToast(`Could not cancel meet: ${error.message}`);
      window.setTimeout(() => setToast(null), 5000);
      return;
    }

    applyMeetPatch(rideId, {
      status: "canceled",
      trackingStatus: "ended",
      endedAt,
    });

    setGoing((current) => ({
      ...current,
      [rideId]: false,
    }));

    setToast("Meet canceled.");
    window.setTimeout(() => setToast(null), 2500);
  }


  async function saveMeet(newMeet: HostMeetForm) {
    if (!session?.user?.id || saveMeetInFlightRef.current) return;

    saveMeetInFlightRef.current = true;
    setSavingMeet(true);

    try {
    const meetLat =
      typeof newMeet.meetPointLat === "number" && Number.isFinite(newMeet.meetPointLat)
        ? newMeet.meetPointLat
        : null;

    const meetLng =
      typeof newMeet.meetPointLng === "number" && Number.isFinite(newMeet.meetPointLng)
        ? newMeet.meetPointLng
        : null;

    const destinationLat =
      typeof newMeet.destinationLat === "number" && Number.isFinite(newMeet.destinationLat)
        ? newMeet.destinationLat
        : null;

    const destinationLng =
      typeof newMeet.destinationLng === "number" && Number.isFinite(newMeet.destinationLng)
        ? newMeet.destinationLng
        : null;

    if (
      meetLat === null ||
      meetLng === null ||
      destinationLat === null ||
      destinationLng === null
    ) {
      setToast("Select a meet point and destination from search results.");
      window.setTimeout(() => setToast(null), 3500);
      return;
    }

    let route: { lat: number; lng: number }[] = [];
    let routeSteps: ReturnType<typeof serializeRouteSteps> = [];
    let distance: string | null = newMeet.distance || null;
    let duration: string | null = newMeet.duration || null;

    try {
      const snapped = await buildSnappedRoute({
        origin: {
          lat: meetLat,
          lng: meetLng,
        },
        destination: {
          lat: destinationLat,
          lng: destinationLng,
        },
      });

      route = snapped.geometry;
      routeSteps = serializeRouteSteps(
        buildNavigationStepsFromSnapped(snapped.steps, snapped.geometry),
      );

      distance = `${(snapped.distanceMeters * 0.000621371).toFixed(1)} miles`;

      duration = formatRouteDurationLabel(snapped.durationSeconds);
    } catch (error) {
      console.error("Route generation failed", error);
    }

    if (!hasRoadGeometry(route)) {
      setToast("Could not generate a road route for those locations.");
      window.setTimeout(() => setToast(null), 3500);
      return;
    }

    const createIdempotencyKey =
      !editingMeet
        ? createMeetIdempotencyKeyRef.current ?? createMeetIdempotencyKey()
        : null;

    if (!editingMeet && !createMeetIdempotencyKeyRef.current) {
      createMeetIdempotencyKeyRef.current = createIdempotencyKey;
    }

    const payload = {
      host_id: session.user.id,
      ...(createIdempotencyKey ? { create_idempotency_key: createIdempotencyKey } : {}),
      name: newMeet.name,
      date: newMeet.date,
      time: newMeet.time,
      meet_point: newMeet.meetPoint,
      meet_point_lat: meetLat,
      meet_point_lng: meetLng,
      destination: newMeet.destination,
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      city: newMeet.meetPoint,
      type: newMeet.type,
      privacy: newMeet.privacy,
      visibility: newMeet.visibility,
      priority_access: "off",
      priority_open_at: null,
      distance,
      duration,
      description: newMeet.description || null,
      cover: newMeet.cover || DEFAULT_COVER,
      status: "active",
      route,
      route_steps: routeSteps,
      waypoints: [],
      meet_duration_minutes: null,
    };

    const { data, error } = editingMeet
      ? await supabase
          .from(MEET_TABLES.meets)
          .update(payload)
          .eq("id", editingMeet.id)
          .eq("host_id", session.user.id)
          .select("*")
          .single()
      : await supabase.from(MEET_TABLES.meets).insert(payload).select("*").single();

    if (error) {
      if (!editingMeet && isMeetCreateDuplicateError(error) && createIdempotencyKey) {
        const { data: existingRow, error: existingError } = await supabase
          .from(MEET_TABLES.meets)
          .select("*")
          .eq("host_id", session.user.id)
          .eq("create_idempotency_key", createIdempotencyKey)
          .maybeSingle();

        if (!existingError && existingRow) {
          const existingMeet = meetRowToMeet(existingRow as MeetRow);
          setRealMeets((current) =>
            dedupeMeetsById(
              current.some((ride) => ride.id === existingMeet.id)
                ? current
                : [existingMeet, ...current],
            ),
          );
          setGoing((current) => ({ ...current, [existingMeet.id]: true }));
          closeHostModalWithHistory();
          setToast("Meet already created.");
          window.setTimeout(() => setToast(null), 2500);
          return;
        }
      }

      console.error("Failed to save meet:", error);
      setToast(editingMeet ? "Could not update meet." : "Could not create meet.");
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    const savedRow = data as MeetRow;
    const hostAttendee: MeetAttendee = {
      name: "Crimson Member",
      photo: DEFAULT_HOST_PHOTO,
    };

    if (!editingMeet) {
      const { error: attendeeError } = await supabase.from(MEET_TABLES.attendees).upsert(
        {
          ride_id: savedRow.id,
          user_id: session.user.id,
          status: "going",
        },
        {
          onConflict: "ride_id,user_id",
        }
      );

      if (attendeeError) {
        console.error("Failed to add host as meet attendee:", attendeeError);
      }

      const { data: profile } = await supabase
        .from("public_profiles")
        .select("id, username, display_name, full_name, profile_image_url, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();

      savedRow.host = profile || null;
      hostAttendee.name =
        profile?.display_name?.trim() ||
        profile?.full_name?.trim() ||
        profile?.username?.trim() ||
        "Crimson Member";
      hostAttendee.photo = profile?.profile_image_url || profile?.avatar_url || DEFAULT_HOST_PHOTO;
      hostAttendee.username = profile?.username ?? null;
      savedRow.attendeeRiders = [hostAttendee];
    }

    const savedMeet = meetRowToMeet(savedRow);

    setRealMeets((current) =>
      dedupeMeetsById(
        editingMeet
          ? current.map((ride) => (ride.id === editingMeet.id ? savedMeet : ride))
          : [savedMeet, ...current.filter((ride) => ride.id !== savedMeet.id)],
      ),
    );

    if (!editingMeet) {
      setGoing((current) => ({
        ...current,
        [savedMeet.id]: true,
      }));
    }

    if (selectedMeet?.id === savedMeet.id) {
      setSelectedMeet(savedMeet);
    }

    closeHostModalWithHistory();
    setToast(editingMeet ? "Meet updated!" : "Meet created!");
    window.setTimeout(() => setToast(null), 2500);
    } finally {
      saveMeetInFlightRef.current = false;
      setSavingMeet(false);
    }
  }


  useEffect(() => {
    if (!session?.user?.id) {
      setViewerHasBlackcard(false);
      setFollowingHostIds(new Set());
      setFavoritedHostIds(new Set());
      return;
    }

    let active = true;
    const userId = session.user.id;

    void (async () => {
      const [membershipResponse, profileResponse, followsResponse, favoritesResponse] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("user_id", userId)
          .order("current_period_end", { ascending: false, nullsFirst: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("is_premium, premium_tier, premium_expires_at, is_founding_blackcard, founding_blackcard_granted_at, membership_tier, blackcard_public")
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("user_follows").select("following_id").eq("follower_id", userId),
        supabase.from("favorite_riders").select("favorite_user_id").eq("user_id", userId),
      ]);

      if (!active) return;

      setViewerHasBlackcard(
        hasBlackcardAccess((membershipResponse.data as MembershipRow | null) ?? null, isAdmin, {
          profile: profileResponse.data,
          blackcardPublic: profileResponse.data?.blackcard_public,
        }),
      );
      setFollowingHostIds(new Set((followsResponse.data || []).map((row) => row.following_id)));
      setFavoritedHostIds(
        new Set((favoritesResponse.data || []).map((row) => row.favorite_user_id)),
      );
    })();

    return () => {
      active = false;
    };
  }, [isAdmin, session?.user?.id]);

  function meetAccessContext(ride: Meet) {
    return {
      viewerId: session?.user?.id,
      hostId: ride.hostId,
      visibility: ride.visibility,
      legacyPrivacy: ride.privacy,
      isAdmin,
      viewerHasBlackcard,
      viewerFollowsHost: ride.hostId ? followingHostIds.has(ride.hostId) : false,
      viewerFavoritedHost: ride.hostId ? favoritedHostIds.has(ride.hostId) : false,
    };
  }

  function meetJoinBlocked(ride: Meet, isGoing: boolean) {
    return !canSelfJoinMeet({
      privacy: ride.privacy,
      visibility: ride.visibility,
      hostId: ride.hostId,
      userId: session?.user?.id,
      isAdmin,
      hasBlackcardAccess: viewerHasBlackcard,
      viewerFollowsHost: ride.hostId ? followingHostIds.has(ride.hostId) : false,
      viewerFavoritedHost: ride.hostId ? favoritedHostIds.has(ride.hostId) : false,
      isGoing,
    });
  }

  const lifecycleTabIndex =
    lifecycleTab === "upcoming" ? 0 : lifecycleTab === "active" ? 1 : 2;

  const renderMeetPanel = (meets: Meet[], listLabel: string, isPrimaryPanel: boolean) => {
    const panelFeatured = meets[0];
    const panelCompact = meets.slice(1);

    return (
      <>
        {loadingMeets && (
          <section className="mt-7 overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]">
            <div className="h-[280px] animate-pulse bg-white/10 sm:h-[360px]" />
            <div className="space-y-4 p-5 sm:p-6">
              <div className="h-4 w-2/3 rounded-full bg-white/10" />
              <div className="h-3 w-1/2 rounded-full bg-white/10" />
              <div className="flex flex-wrap gap-2">
                <div className="h-10 w-36 rounded-lg bg-white/10" />
                <div className="h-10 w-24 rounded-lg bg-white/10" />
              </div>
            </div>
          </section>
        )}

        {!loadingMeets && panelFeatured && (
          <section className="mt-7 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(127,17,27,0.1),rgba(255,255,255,0.025))]">
            <div className="relative h-[220px] sm:h-[280px]">
              <Image
                src={panelFeatured.cover}
                alt={panelFeatured.name}
                fill
                priority={isPrimaryPanel}
                sizes="(max-width: 768px) 100vw, 1080px"
                className="object-cover"
              />

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-md border border-white/15 bg-black/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-100 backdrop-blur-md">
                  {panelFeatured.type}
                </span>

                <span className="rounded-md border border-[#b4141e]/45 bg-[#b4141e]/20 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f0c9ce] backdrop-blur-md">
                  Featured
                </span>
              </div>
            </div>

            <div className="border-t border-white/8 bg-[#0a0607]/80 px-5 py-5 sm:px-6">
              <h2 className="font-serif text-[34px] leading-none text-[#f4f0ea] sm:text-5xl">
                {panelFeatured.name}
              </h2>

              <p className="mt-3 text-[10px] uppercase tracking-[0.19em] text-[#d85f6c]">
                {panelFeatured.date} / {formatTime(panelFeatured.time)}
              </p>

              <p className="mt-2 text-sm text-zinc-400">
                {panelFeatured.distance} / {panelFeatured.duration} / {panelFeatured.meetPoint}
              </p>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              {panelFeatured.description ? (
                <p className="max-w-2xl text-sm leading-6 text-zinc-300">{panelFeatured.description}</p>
              ) : (
                <p className="max-w-2xl text-sm leading-6 text-zinc-500">
                  {panelFeatured.meetPoint} to {panelFeatured.destination}
                </p>
              )}

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openMeetDetails(panelFeatured)}
                  className="relative rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
                >
                  View Route / Details
                  {(unreadCounts[panelFeatured.id] || 0) > 0 && (
                    <span className={`absolute -right-2 -top-2 ${CS_BADGE_SM} uppercase tracking-[0.12em]`}>
                      {unreadCounts[panelFeatured.id]} new
                    </span>
                  )}
                </button>

                {panelFeatured.hostId === session?.user?.id && (
                  <button
                    type="button"
                    onClick={() => setEditingMeet(panelFeatured)}
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
                  >
                    Edit
                  </button>
                )}

                {(panelFeatured.hostId === session?.user?.id || isAdmin) &&
                  panelFeatured.status !== "canceled" && (
                    <button
                      type="button"
                      onClick={() => void cancelMeet(panelFeatured.id)}
                      className="rounded-lg border border-[#b4141e]/60 bg-[#b4141e]/18 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f0c9ce] transition hover:bg-[#b4141e]/28"
                    >
                      Cancel
                    </button>
                  )}

                {isMeetHostOrCoHost(panelFeatured, session?.user?.id) ? (
                  <span className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f0c9ce]">
                    {isPrimaryMeetHost(panelFeatured, session?.user?.id) ? "Hosting" : "Co-hosting"}
                  </span>
                ) : going[panelFeatured.id] ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Leave this meet?")) {
                        void leaveMeet(panelFeatured.id);
                      }
                    }}
                    disabled={panelFeatured.status === "canceled"}
                    className="rounded-lg border border-[#b4141e]/50 bg-transparent px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#e87a82] transition hover:bg-[#b4141e]/10 disabled:opacity-55"
                  >
                    Leave Meet
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void joinMeet(panelFeatured.id)}
                    disabled={
                      panelFeatured.status === "canceled" ||
                      meetJoinBlocked(panelFeatured, false)
                    }
                    className={`rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-55 ${
                      meetJoinBlocked(panelFeatured, false)
                        ? "border-white/10 bg-white/[0.02] text-zinc-600"
                        : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#b4141e]/60 hover:bg-[#b4141e]/16"
                    }`}
                  >
                    {meetJoinBlocked(panelFeatured, false) ? "Locked" : "Join Meet"}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{listLabel}</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">{meets.length} listed</p>
          </div>

          <div className="mt-4 grid gap-3">
            {loadingMeets &&
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex animate-pulse gap-4">
                    <div className="h-24 w-28 shrink-0 rounded-lg bg-white/10" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 w-2/3 rounded-full bg-white/10" />
                      <div className="h-3 w-1/2 rounded-full bg-white/10" />
                      <div className="h-3 w-4/5 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}

            {!loadingMeets && panelCompact.map((ride) => {
              const isGoingRide = !!going[ride.id];
              const canManageRide = isPrimaryMeetHost(ride, session?.user?.id);
              const hostTeam = isMeetHostOrCoHost(ride, session?.user?.id);
              const canModerateRide = hostTeam || isAdmin;
              const locked =
                !hostTeam &&
                !canViewMeetForUser(meetAccessContext(ride));

              return (
                <MeetCard
                  key={ride.id}
                  ride={ride}
                  canManage={canManageRide}
                  canModerate={canModerateRide}
                  isHostTeam={hostTeam}
                  unreadCount={unreadCounts[ride.id] || 0}
                  isLocked={locked}
                  lockMessage={
                    locked
                      ? getMeetJoinBlockMessage({
                          privacy: ride.privacy,
                          visibility: ride.visibility,
                        })
                      : null
                  }
                  joinBlocked={meetJoinBlocked(ride, isGoingRide)}
                  onEdit={() => setEditingMeet(ride)}
                  isGoing={isGoingRide}
                  onCancel={() => void cancelMeet(ride.id)}
                  onJoin={() => void joinMeet(ride.id)}
                  onLeave={() => {
                    if (window.confirm("Leave this meet?")) {
                      void leaveMeet(ride.id);
                    }
                  }}
                  onViewDetails={() => openMeetDetails(ride)}
                />
              );
            })}
          </div>
        </section>
      </>
    );
  };

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

      <div className={`relative mx-auto max-w-[1080px] px-4 pt-[calc(env(safe-area-inset-top)+28px)] sm:px-6 ${BOTTOM_NAV_CLEARANCE}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            Meet Ledger
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={blackcardLeaderboardHref(true)}
              className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/15 sm:px-4 sm:text-[11px] sm:tracking-[0.16em]"
            >
              🏆 Blackcard Leaderboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setEditingMeet(null);
                createMeetIdempotencyKeyRef.current = createMeetIdempotencyKey();
                setShowHostModal(true);
              }}
              className={CS_HOST_MEET_BTN}
            >
              + Host Meet
            </button>
          </div>
        </div>

        <header className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">
            Featured Meets
          </p>

          <h1 className="mt-3 font-serif text-[46px] leading-none text-[#f4f0ea] sm:text-7xl">
            Meets
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Curated routes, disciplined company, and one clean line into live ride tracking.
          </p>
        </header>

        <div className="mt-7 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setLifecycleTab("upcoming")}
            className={`${csPill(lifecycleTab === "upcoming", "md")} py-2.5 text-[10px] tracking-[0.18em]`}
          >
            Upcoming ({upcomingMeets.length})
          </button>
          <button
            type="button"
            onClick={() => setLifecycleTab("active")}
            className={`${csPill(lifecycleTab === "active", "md")} py-2.5 text-[10px] tracking-[0.18em]`}
          >
            Active ({activeMeets.length})
          </button>
          <button
            type="button"
            onClick={() => setLifecycleTab("past")}
            className={`${csPill(lifecycleTab === "past", "md")} py-2.5 text-[10px] tracking-[0.18em]`}
          >
            Past ({pastMeets.length})
          </button>
        </div>

        <SwipeTabPanels
          activeIndex={lifecycleTabIndex}
          onIndexChange={(index) => setLifecycleTab(index === 0 ? "upcoming" : index === 1 ? "active" : "past")}
          className="mt-1"
        >
          {renderMeetPanel(upcomingMeets, "Upcoming Meets", true)}
          {renderMeetPanel(activeMeets, "Active Meets", true)}
          {renderMeetPanel(pastMeets, "Past Meets", false)}
        </SwipeTabPanels>
      </div>

      {selectedMeet && (
        <MeetDetailsModal
          meet={selectedMeet}
          isGoing={!!going[selectedMeet.id]}
          isAdmin={isAdmin}
          scrollToChat={meetSectionParam === "chat"}
          onJoin={() => void joinMeet(selectedMeet.id)}
          onLeave={() => void leaveMeet(selectedMeet.id)}
          onRefreshAttendees={() => void refreshMeetAttendees(selectedMeet.id)}
          onRead={markMeetRead}
          onClose={() => setSelectedMeet(null)}
          onMeetUpdated={(patch) => applyMeetPatch(selectedMeet.id, patch)}
          onAttendeesChanged={(nextGoing) => {
            setSelectedMeet((current) =>
              current ? { ...current, going: nextGoing } : current
            );
            setRealMeets((current) =>
              current.map((item) =>
                item.id === selectedMeet.id ? { ...item, going: nextGoing } : item
              )
            );
          }}
          onCancelMeet={() => void cancelMeet(selectedMeet.id)}
          onEditMeet={
            isPrimaryMeetHost(
              { hostId: selectedMeet.hostId, coHostId: selectedMeet.coHostId },
              session?.user?.id,
            ) || isAdmin
              ? () => {
                  setEditingMeet(selectedMeet);
                  setSelectedMeet(null);
                }
              : undefined
          }
        />
      )}

      {hostModalOpen && (
        <HostMeetModal
          mode={editingMeet ? "edit" : "create"}
          canHostBlackcard={viewerHasBlackcard || isAdmin}
          initialForm={editingMeet ? meetToForm(editingMeet) : undefined}
          onClose={closeHostModalWithHistory}
          isSubmitting={savingMeet}
          onCreate={(newMeet) => void saveMeet(newMeet)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-[calc(var(--bottom-nav-clearance)+0.5rem)] z-50 mx-auto max-w-sm rounded-lg border border-[#b4141e]/55 bg-[#10080a]/95 px-4 py-3 text-center text-sm text-[#f0c9ce] shadow-[0_22px_60px_-28px_rgba(0,0,0,0.95)] backdrop-blur-md">
          {toast}
        </div>
      )}
    </main>
  );
}

export default function MeetsPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
          <div className={`relative mx-auto max-w-[1080px] px-4 pt-[calc(env(safe-area-inset-top)+28px)] sm:px-6 ${BOTTOM_NAV_CLEARANCE}`}>
            <div className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/[0.03]" />
          </div>
        </main>
      }
    >
      <MeetsPageContent />
    </Suspense>
  );
}
