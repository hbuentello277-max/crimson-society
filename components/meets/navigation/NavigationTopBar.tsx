import Link from "next/link";
import { memo } from "react";
import { meetLifecycleLabel } from "@/lib/meets/lifecycle";
import {
  gpsConnectionLabel,
  navigationStateLabel,
} from "@/lib/meets/navigation/state-machine";
import type { NavigationSession } from "@/lib/meets/navigation/types";

type NavigationTopBarProps = {
  session: NavigationSession;
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

function NavigationTopBarComponent({ session }: NavigationTopBarProps) {
  const meet = session.meet;
  const gpsConnected = session.gpsStatus === "connected";

  return (
    <div className="shrink-0 border-b border-white/8 bg-[#050405]/95 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+6px)] backdrop-blur-md sm:px-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[#e87a82]">Meet Navigation</p>
          <h1 className="mt-0.5 truncate font-serif text-lg leading-tight text-white sm:text-xl">
            {meet?.name ?? "Meet"}
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-1 text-[8px] uppercase tracking-[0.1em] text-zinc-300">
            {meet ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5">
                {meetLifecycleLabel(meet.lifecyclePhase)}
              </span>
            ) : null}
            {meet ? (
              <span className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/12 px-1.5 py-0.5 text-[#f1c3c7]">
                {trackingStatusLabel(meet.trackingStatus)}
              </span>
            ) : null}
            {meet?.hostName ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5">
                Host {meet.hostName}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-zinc-400">
            <span className={gpsConnected ? "text-emerald-300" : "text-zinc-400"}>
              {gpsConnectionLabel(session.gpsStatus)}
            </span>
            <span className="mx-1.5 text-zinc-600" aria-hidden>
              •
            </span>
            <span className="text-[#f1c3c7]">{navigationStateLabel(session.navigationState)}</span>
          </p>
        </div>

        <Link
          href="/meets"
          className="shrink-0 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-zinc-200 backdrop-blur transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7] sm:px-3 sm:py-1.5 sm:text-[9px]"
        >
          Exit
        </Link>
      </div>
    </div>
  );
}

export const NavigationTopBar = memo(NavigationTopBarComponent);
