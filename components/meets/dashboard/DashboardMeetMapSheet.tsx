"use client";

import Link from "next/link";
import { NavigateToMeetButton } from "@/components/meets/NavigateToMeetButton";
import {
  dashboardMeetToStartRideInput,
  StartRideLink,
} from "@/components/meets/StartRideLink";
import {
  dashboardMeetHasRoute,
  dashboardMeetLifecycleLabel,
  type DashboardMapMeet,
} from "@/lib/meets/dashboard-map";
import {
  dashboardMapSheetPrimaryActionLabel,
  resolveDashboardMapSheetPrimaryAction,
} from "@/lib/meets/dashboard-map-sheet-actions";
import { hasMapsNavigationTarget } from "@/lib/meets/maps-links";

type DashboardMeetMapSheetProps = {
  meet: DashboardMapMeet | null;
  open: boolean;
  isGoing: boolean;
  isHostTeam: boolean;
  canJoin: boolean;
  joinBlockedMessage?: string | null;
  onClose: () => void;
  onJoin: () => void;
  onLeave: () => void;
};

function formatMeetSchedule(date: string, time: string) {
  const parsed = new Date(`${date}T${time && time.includes(":") ? time : "00:00"}`);
  if (Number.isNaN(parsed.getTime())) {
    return `${date || "Date TBD"} • ${time || "Time TBD"}`;
  }

  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardMeetMapSheet({
  meet,
  open,
  isGoing,
  isHostTeam,
  canJoin,
  joinBlockedMessage,
  onClose,
  onJoin,
  onLeave,
}: DashboardMeetMapSheetProps) {
  if (!open || !meet) return null;

  const hasRoute = dashboardMeetHasRoute(meet);
  const primaryAction = resolveDashboardMapSheetPrimaryAction({
    hasRoute,
    lifecyclePhase: meet.lifecyclePhase,
    trackingStatus: meet.trackingStatus,
    isHostTeam,
    isGoing,
    hasMapsTarget: hasMapsNavigationTarget({ lat: meet.lat, lng: meet.lng }),
  });

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close meet details"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-[86] w-full max-w-lg px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#09090b]/95 shadow-[0_30px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="border-b border-white/8 px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">Meet on map</p>
            <h2 className="mt-1 font-serif text-2xl text-white">{meet.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em]">
              <span className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/15 px-2.5 py-1 text-[#f1c3c7]">
                {dashboardMeetLifecycleLabel(meet.lifecyclePhase)}
              </span>
              {meet.liveRiderCount > 0 ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-zinc-200">
                  {meet.liveRiderCount} live
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-zinc-300">
                {meet.riderCount} going
              </span>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4 text-sm text-zinc-300">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Start</p>
              <p className="mt-1 text-zinc-100">{formatMeetSchedule(meet.date, meet.time)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Route</p>
              <p className="mt-1 text-zinc-100">
                {meet.meetPoint} → {meet.destination}
              </p>
              {meet.distance || meet.duration ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {[meet.distance, meet.duration].filter(Boolean).join(" • ")}
                </p>
              ) : null}
              {!hasRoute ? (
                <p className="mt-1 text-xs text-zinc-500">Route preview unavailable</p>
              ) : null}
            </div>
            {meet.hostName ? (
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Host</p>
                <p className="mt-1 text-zinc-100">{meet.hostName}</p>
                {meet.coHostName ? (
                  <p className="mt-1 text-zinc-300">Co-host: {meet.coHostName}</p>
                ) : null}
              </div>
            ) : null}
            {joinBlockedMessage && !isGoing ? (
              <p className="rounded-xl border border-[#b4141e]/35 bg-[#14080b]/80 px-3 py-2 text-xs leading-5 text-[#f0c9ce]">
                {joinBlockedMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 border-t border-white/8 p-3">
            <Link
              href={`/meets?meet=${meet.id}`}
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3.5 text-[11px] uppercase tracking-[0.16em] text-zinc-100 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
            >
              View Meet
            </Link>

            {!isHostTeam && !isGoing && canJoin ? (
              <button
                type="button"
                onClick={onJoin}
                className="flex w-full items-center justify-center rounded-2xl border border-[#b4141e]/70 bg-[#b4141e]/25 px-4 py-3.5 text-[11px] uppercase tracking-[0.16em] text-[#f4dadd] transition hover:bg-[#b4141e]/40"
              >
                Join Meet
              </button>
            ) : null}

            {!isHostTeam && isGoing ? (
              <button
                type="button"
                onClick={onLeave}
                className="flex w-full items-center justify-center rounded-2xl border border-[#b4141e]/50 bg-transparent px-4 py-3.5 text-[11px] uppercase tracking-[0.16em] text-[#e87a82] transition hover:bg-[#b4141e]/10"
              >
                Leave Meet
              </button>
            ) : null}

            {primaryAction === "start_ride" || primaryAction === "navigate_in_app" ? (
              <StartRideLink
                meet={dashboardMeetToStartRideInput(meet)}
                label={dashboardMapSheetPrimaryActionLabel(primaryAction)}
                className="flex w-full items-center justify-center rounded-2xl border border-[#b4141e]/70 bg-[#b4141e]/25 px-4 py-3.5 text-[11px] uppercase tracking-[0.16em] text-[#f4dadd] transition hover:bg-[#b4141e]/40"
                onNavigate={onClose}
              />
            ) : null}

            {primaryAction === "navigate_external" ? (
              <NavigateToMeetButton
                target={{ lat: meet.lat, lng: meet.lng, label: meet.meetPoint }}
              />
            ) : null}

            {hasRoute ? (
              <Link
                href={`/meets?meet=${meet.id}`}
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3.5 text-[11px] uppercase tracking-[0.16em] text-zinc-200 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
              >
                View Route
              </Link>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl px-4 py-3.5 text-center text-sm uppercase tracking-[0.18em] text-zinc-400 transition hover:bg-white/[0.04]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
