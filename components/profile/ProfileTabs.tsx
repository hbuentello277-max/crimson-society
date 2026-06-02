"use client";

import type { ComponentType } from "react";
import { PROFILE_TAB_ICONS } from "@/components/profile/ProfileIcons";

export type ProfileTab = "posts" | "rides" | "garage" | "saved";

type Tab = {
  k: ProfileTab;
  label: string;
  Icon?: ComponentType<{ className?: string }>;
};

type Props = {
  tabs: Tab[];
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
};

export default function ProfileTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="mt-4 flex border-b border-white/10">
      {tabs.map((item) => {
        const Icon = item.Icon || PROFILE_TAB_ICONS[item.k];
        const isActive = active === item.k;

        return (
          <button
            key={item.k}
            type="button"
            onClick={() => onChange(item.k)}
            className={`flex min-h-9 flex-1 flex-col items-center justify-center gap-0.5 px-1 pb-2 pt-1 transition ${
              isActive
                ? "border-b-2 border-[#b4141e] text-[#e87a82]"
                : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className={isActive ? "text-[#e87a82]" : "text-zinc-500"} />
            <span className="text-[9px] uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.18em]">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
