"use client";

import {
  hasMapsNavigationTarget,
  openMapsNavigation,
  type MapsNavigationTarget,
} from "@/lib/meets/maps-links";

type NavigateToMeetButtonProps = {
  target: Partial<MapsNavigationTarget> | null | undefined;
  className?: string;
  label?: string;
};

export function NavigateToMeetButton({
  target,
  className = "flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3.5 text-[11px] uppercase tracking-[0.16em] text-zinc-100 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]",
  label = "Navigate to Meet",
}: NavigateToMeetButtonProps) {
  if (!hasMapsNavigationTarget(target)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => openMapsNavigation(target)}
      className={className}
    >
      {label}
    </button>
  );
}
