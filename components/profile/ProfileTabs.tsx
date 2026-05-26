"use client";

export type ProfileTab = "posts" | "rides" | "garage" | "saved" | "blackcard";

type Tab = { k: ProfileTab; label: string };

type Props = {
  tabs: Tab[];
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
};

export default function ProfileTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="mt-6 flex gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1">
      {tabs.map((item) => (
        <button
          key={item.k}
          type="button"
          onClick={() => onChange(item.k)}
          className={`min-h-10 flex-1 rounded-full px-1 text-[10px] uppercase tracking-[0.18em] transition sm:text-xs sm:tracking-[0.28em] ${
            active === item.k
              ? "bg-[#b4141e]/30 text-[#e87a82]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
