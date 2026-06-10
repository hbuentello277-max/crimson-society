import { memo } from "react";
import { formatSpeedHudLabel } from "@/lib/meets/navigation/speed";
import type { NavigationSpeedHud as NavigationSpeedHudState } from "@/lib/meets/navigation/speed";

type NavigationSpeedHudProps = {
  speed: NavigationSpeedHudState;
};

function NavigationSpeedHudComponent({ speed }: NavigationSpeedHudProps) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[500] flex gap-2">
      <div className="rounded-xl border border-white/10 bg-black/75 px-2.5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-500">Current Speed</p>
        <p className="mt-0.5 text-base font-semibold leading-none text-white">
          {formatSpeedHudLabel(speed.currentMph)}
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/75 px-2.5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-500">Max Rider Speed</p>
        <p className="mt-0.5 text-base font-semibold leading-none text-[#e87a82]">
          {formatSpeedHudLabel(speed.maxMph)}
        </p>
      </div>
    </div>
  );
}

export const NavigationSpeedHud = memo(NavigationSpeedHudComponent);
