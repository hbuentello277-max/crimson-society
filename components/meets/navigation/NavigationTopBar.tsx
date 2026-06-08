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

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] bg-gradient-to-b from-black/80 via-black/35 to-transparent px-4 pb-10 pt-[calc(env(safe-area-inset-top)+14px)]">
      <div className="pointer-events-auto flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Meet Navigation</p>
          <h1 className="mt-1 truncate font-serif text-3xl leading-none text-white">
            {meet?.name ?? "Meet"}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-200">
            {meet ? (
              <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
                {meetLifecycleLabel(meet.lifecyclePhase)}
              </span>
            ) : null}
            {meet ? (
              <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
                {trackingStatusLabel(meet.trackingStatus)}
              </span>
            ) : null}
            {meet?.hostName ? (
              <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
                Host {meet.hostName}
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
              {gpsConnectionLabel(session.gpsStatus)}
            </span>
            <span className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/15 px-2.5 py-1 backdrop-blur text-[#f1c3c7]">
              {navigationStateLabel(session.navigationState)}
            </span>
          </div>
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
