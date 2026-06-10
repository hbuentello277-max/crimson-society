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
    <div className="shrink-0 border-b border-white/8 bg-[#050405]/95 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.26em] text-[#e87a82]">Meet Navigation</p>
          <h1 className="mt-0.5 truncate font-serif text-xl leading-tight text-white sm:text-2xl">
            {meet?.name ?? "Meet"}
          </h1>

          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[8px] uppercase tracking-[0.1em] text-zinc-300 sm:text-[9px]">
            {meet ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                {meetLifecycleLabel(meet.lifecyclePhase)}
              </span>
            ) : null}
            {meet ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                {trackingStatusLabel(meet.trackingStatus)}
              </span>
            ) : null}
            {meet?.hostName ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                Host {meet.hostName}
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                gpsConnected
                  ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.04] text-zinc-300"
              }`}
            >
              {gpsConnected ? <span className="text-[8px] text-emerald-400">●</span> : null}
              {gpsConnectionLabel(session.gpsStatus)}
            </span>
            <span className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/12 px-2 py-0.5 text-[#f1c3c7]">
              {navigationStateLabel(session.navigationState)}
            </span>
          </div>
        </div>

        <Link
          href="/meets"
          className="shrink-0 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-zinc-200 backdrop-blur transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
        >
          Exit
        </Link>
      </div>
    </div>
  );
}

export const NavigationTopBar = memo(NavigationTopBarComponent);
