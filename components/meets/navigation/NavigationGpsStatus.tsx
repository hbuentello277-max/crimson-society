"use client";

import { memo } from "react";
import {
  navigationGpsStatusLabel,
  resolveNavigationGpsDisplayStatus,
} from "@/lib/meets/navigation/gps-status";
import type { NavigationSession } from "@/lib/meets/navigation/types";

type NavigationGpsStatusProps = {
  session: NavigationSession;
};

function statusTone(status: ReturnType<typeof resolveNavigationGpsDisplayStatus>) {
  switch (status) {
    case "connected":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
    case "recovering":
      return "border-amber-500/40 bg-amber-500/10 text-amber-100";
    case "permission_denied":
    case "unavailable":
      return "border-[#b4141e]/45 bg-[#b4141e]/12 text-[#f0c9ce]";
    default:
      return "border-white/10 bg-white/[0.04] text-zinc-300";
  }
}

function NavigationGpsStatusComponent({ session }: NavigationGpsStatusProps) {
  const displayStatus = resolveNavigationGpsDisplayStatus({
    gpsStatus: session.gpsStatus,
    navigationState: session.navigationState,
  });
  const label = navigationGpsStatusLabel(displayStatus);

  if (!label) return null;

  return (
    <div
      className="shrink-0 border-b border-white/6 bg-[#050405]/90 px-3 py-1.5 backdrop-blur-sm sm:px-4"
      role="status"
      aria-live="polite"
    >
      <p
        className={`mx-auto max-w-md rounded-full border px-2.5 py-1 text-center text-[10px] font-medium uppercase tracking-[0.12em] ${statusTone(displayStatus)}`}
      >
        {label}
      </p>
    </div>
  );
}

export const NavigationGpsStatus = memo(NavigationGpsStatusComponent);
