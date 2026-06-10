import { memo } from "react";
import { formatSpeedHudLabel } from "@/lib/meets/navigation/speed";
import type { NavigationSpeedHud as NavigationSpeedHudState } from "@/lib/meets/navigation/speed";

type NavigationSpeedHudProps = {
  speed: NavigationSpeedHudState;
};

function NavigationSpeedHudComponent({ speed }: NavigationSpeedHudProps) {
  return (
    <div className="pointer-events-none absolute right-4 top-[calc(env(safe-area-inset-top)+7.5rem)] z-[600] sm:top-[calc(env(safe-area-inset-top)+8rem)]">
      <div className="rounded-2xl border border-white/10 bg-black/75 px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Current Speed</p>
        <p className="mt-1 text-lg font-semibold leading-none text-white">
          {formatSpeedHudLabel(speed.currentMph)}
        </p>
      </div>
    </div>
  );
}

export const NavigationSpeedHud = memo(NavigationSpeedHudComponent);
