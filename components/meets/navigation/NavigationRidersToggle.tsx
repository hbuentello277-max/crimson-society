"use client";

import { memo } from "react";

type NavigationRidersToggleProps = {
  showRiders: boolean;
  liveRiderCount: number;
  visible: boolean;
  onToggle: () => void;
};

function NavigationRidersToggleComponent({
  showRiders,
  liveRiderCount,
  visible,
  onToggle,
}: NavigationRidersToggleProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="pointer-events-auto absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-full border border-white/12 bg-black/70 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-zinc-100 shadow-lg backdrop-blur-md transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
      Show riders {showRiders ? "on" : "off"}
      {liveRiderCount > 0 ? ` • ${liveRiderCount}` : ""}
    </button>
  );
}

export const NavigationRidersToggle = memo(NavigationRidersToggleComponent);
