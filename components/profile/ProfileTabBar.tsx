"use client";

export type PublicProfileTab = "posts" | "garage" | "rides";

type TabItem<T extends string> = { k: T; label: string };

type Props<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (tab: T) => void;
};

export function ProfileTabBar<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className="mt-4 flex border-b border-white/10">
      {tabs.map((item) => (
        <button
          key={item.k}
          type="button"
          onClick={() => onChange(item.k)}
          className={`min-h-9 flex-1 px-2 pb-2.5 pt-1 text-[10px] uppercase tracking-[0.2em] transition sm:text-[11px] ${
            active === item.k
              ? "border-b-2 border-[#b4141e] text-[#e87a82]"
              : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
