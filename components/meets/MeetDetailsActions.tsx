"use client";

import Link from "next/link";
import { NavigateToMeetButton } from "@/components/meets/NavigateToMeetButton";
import { writeActiveMeetSession } from "@/lib/meets/active-meet-session";
import { meetNavigationHref } from "@/lib/meets/load-navigation-meet";
import type { Meet, MeetTrackingStatus } from "@/lib/meets/types";
import type { RoutePoint } from "@/lib/meets/route-geometry";

type MeetDetailsActionsProps = {
  meet: Meet;
  safeRoute: RoutePoint[];
  hasRoute: boolean;
  isAnyHost: boolean;
  isGoing: boolean;
  isCanceled: boolean;
  isRideLive: boolean;
  trackingBusy: boolean;
  onStartMeet: () => void;
  onLeaveMeet: () => void;
  onJoinMeet: () => void;
  inviteJoinBlocked: boolean;
};

const primaryBtn =
  "flex w-full items-center justify-center rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#b4141e]/40 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryBtn =
  "flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-100 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]";
const dangerBtn =
  "flex w-full items-center justify-center rounded-lg border border-[#b4141e]/45 bg-transparent py-2.5 text-[10px] uppercase tracking-[0.18em] text-[#e87a82] transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/10";

function StartRideLink({
  meet,
  safeRoute,
  className,
}: {
  meet: Meet;
  safeRoute: RoutePoint[];
  className: string;
}) {
  return (
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
          trackingStatus: (meet.trackingStatus ?? "not_started") as MeetTrackingStatus,
          startedAt: meet.startedAt ?? null,
          endedAt: meet.endedAt ?? null,
        });
      }}
      className={className}
    >
      Start Ride
    </Link>
  );
}

export function MeetDetailsActions({
  meet,
  safeRoute,
  hasRoute,
  isAnyHost,
  isGoing,
  isCanceled,
  isRideLive,
  trackingBusy,
  onStartMeet,
  onLeaveMeet,
  onJoinMeet,
  inviteJoinBlocked,
}: MeetDetailsActionsProps) {
  const showNavigate = !isCanceled;
  const showJoin = !isAnyHost && !isGoing && !isCanceled && !inviteJoinBlocked;
  const showLeave = !isAnyHost && isGoing && !isCanceled;
  const showStartMeet = isAnyHost && !isRideLive && !isCanceled && hasRoute;
  const showStartRideForHost = isAnyHost && isRideLive && !isCanceled && hasRoute;
  const showStartRideForRider = !isAnyHost && isGoing && !isCanceled && hasRoute;

  return (
    <div className="space-y-3">
      {showNavigate ? (
        <NavigateToMeetButton
          target={{ lat: meet.lat, lng: meet.lng, label: meet.meetPoint }}
          className={secondaryBtn}
        />
      ) : null}

      {showStartMeet ? (
        <button type="button" onClick={onStartMeet} disabled={trackingBusy} className={primaryBtn}>
          {trackingBusy ? "Starting…" : "Start Meet"}
        </button>
      ) : null}

      {showStartRideForHost ? (
        <StartRideLink meet={meet} safeRoute={safeRoute} className={primaryBtn} />
      ) : null}

      {showStartRideForRider ? (
        <StartRideLink meet={meet} safeRoute={safeRoute} className={primaryBtn} />
      ) : null}

      {showJoin ? (
        <button type="button" onClick={onJoinMeet} className={primaryBtn}>
          Join Meet
        </button>
      ) : null}

      {showLeave ? (
        <button type="button" onClick={onLeaveMeet} className={dangerBtn}>
          Leave Meet
        </button>
      ) : null}

      {inviteJoinBlocked ? (
        <p className="text-center text-xs leading-5 text-zinc-500">
          Invite-only meet. Ask the host for access.
        </p>
      ) : null}
    </div>
  );
}
