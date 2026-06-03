"use client";

import type { ComponentType } from "react";
import { PROFILE_TAB_ICON_CLASS, PROFILE_TAB_ICONS } from "@/components/profile/ProfileIcons";

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
    <div className="mt-2.5 flex border-b border-white/10">
      {tabs.map((item) => {
        const Icon = item.Icon || PROFILE_TAB_ICONS[item.k];
        const isActive = active === item.k;

        return (
          <button
            key={item.k}
            type="button"
            onClick={() => onChange(item.k)}
            className={`flex min-h-0 flex-1 flex-col items-center justify-end gap-0.5 px-0.5 pb-1 pt-1 transition ${
              isActive
                ? "text-[#e87a82]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon
              className={`${PROFILE_TAB_ICON_CLASS} ${isActive ? "text-[#e87a82]" : "text-zinc-500"}`}
            />
            <span className="text-[9px] uppercase leading-none tracking-[0.12em]">
              {item.label}
            </span>
            <span
              className={`mt-0.5 h-0.5 w-5 rounded-full transition ${
                isActive ? "bg-[#e87a82]" : "bg-transparent"
              }`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
