import Link from "next/link";
import { memo } from "react";
import { meetLifecycleLabel } from "@/lib/meets/lifecycle";
import { formatSpeedHudLabel } from "@/lib/meets/navigation/speed";
import {
  gpsConnectionLabel,
  navigationStateLabel,
} from "@/lib/meets/navigation/state-machine";
import type { NavigationSpeedHud } from "@/lib/meets/navigation/speed";
import type { NavigationSession } from "@/lib/meets/navigation/types";

type NavigationTopBarProps = {
  session: NavigationSession;
  speedHud: NavigationSpeedHud;
  showRiders: boolean;
  liveRiderCount: number;
  onToggleShowRiders: () => void;
};

function trackingStatusLabel(trackingStatus: string) {
  switch (trackingStatus) {
    case "active":
      return "Live";
    case "ended":
      return "Ended";
    default:
      return "Not started";
  }
}

function NavigationTopBarComponent({
  session,
  speedHud,
  showRiders,
  liveRiderCount,
  onToggleShowRiders,
}: NavigationTopBarProps) {
  const meet = session.meet;
  const canShowRiders = meet?.trackingStatus === "active";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] bg-gradient-to-b from-black/85 via-black/40 to-transparent px-4 pb-6 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="pointer-events-auto flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Meet Navigation</p>
          <h1 className="mt-1 truncate font-serif text-2xl leading-none text-white sm:text-3xl">
            {meet?.name ?? "Meet"}
          </h1>

          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[9px] uppercase tracking-[0.12em] text-zinc-200 sm:text-[10px]">
            {meet ? (
              <span className="rounded-full border border-white/10 bg-black/55 px-2 py-0.5 backdrop-blur">
                {meetLifecycleLabel(meet.lifecyclePhase)}
              </span>
            ) : null}
            {meet ? (
              <span className="rounded-full border border-white/10 bg-black/55 px-2 py-0.5 backdrop-blur">
                {trackingStatusLabel(meet.trackingStatus)}
              </span>
            ) : null}
            {meet?.hostName ? (
              <span className="rounded-full border border-white/10 bg-black/55 px-2 py-0.5 backdrop-blur">
                Host {meet.hostName}
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-black/55 px-2 py-0.5 backdrop-blur">
              {gpsConnectionLabel(session.gpsStatus)}
            </span>
            <span className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/15 px-2 py-0.5 backdrop-blur text-[#f1c3c7]">
              {navigationStateLabel(session.navigationState)}
            </span>
          </div>

          <div className="mt-2.5 inline-flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-black/60 backdrop-blur">
            <div className="px-2.5 py-1.5">
              <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-500">Current speed</p>
              <p className="text-sm font-semibold leading-none text-white">
                {formatSpeedHudLabel(speedHud.currentMph)}
              </p>
            </div>
            <div className="border-l border-white/10 px-2.5 py-1.5">
              <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-500">Max speed</p>
              <p className="text-sm font-semibold leading-none text-[#f1c3c7]">
                {formatSpeedHudLabel(speedHud.maxMph)}
              </p>
            </div>
          </div>

          {canShowRiders ? (
            <button
              type="button"
              onClick={onToggleShowRiders}
              className="mt-2 rounded-full border border-white/12 bg-black/55 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-zinc-200 backdrop-blur transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
            >
              Show riders {showRiders ? "on" : "off"}
              {liveRiderCount > 0 ? ` • ${liveRiderCount}` : ""}
            </button>
          ) : null}
        </div>

        <Link
          href="/meets"
          className="shrink-0 rounded-full border border-white/15 bg-black/55 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-200 backdrop-blur transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
        >
          Exit
        </Link>
      </div>
    </div>
  );
}

export const NavigationTopBar = memo(NavigationTopBarComponent);
