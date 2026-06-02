"use client";

import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";

type TabItem = { k: ProfileTab; label: string };

type Props = {
  tabs: TabItem[];
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
};

/** @deprecated Use ProfileTabs directly */
export function ProfileTabBar({ tabs, active, onChange }: Props) {
  return <ProfileTabs tabs={tabs} active={active} onChange={onChange} />;
}

export type { ProfileTab as PublicProfileTab };
