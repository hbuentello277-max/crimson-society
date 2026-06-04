"use client";

import Link from "next/link";
import { useState } from "react";
import { CatalogTab } from "@/components/admin/rewards/CatalogTab";
import { RedemptionsTab } from "@/components/admin/rewards/RedemptionsTab";

const TABS = [
  { id: "catalog", label: "Rewards Catalog" },
  { id: "redemptions", label: "Redemptions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminRewardsPage() {
  const [tab, setTab] = useState<TabId>("catalog");
  const [refreshKey] = useState(0);

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500/70">Control Room</p>
            <h1 className="mt-3 text-4xl font-light tracking-tight">Rewards</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Manage the Crimson Credits rewards catalog and process member redemptions. Members
              redeem from Profile → ⋯ Menu → Rewards (not Shop).
            </p>
          </div>

          <Link
            href="/admin"
            className="text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
          >
            Back to admin
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                tab === item.id
                  ? "border border-[#b4141e]/50 bg-[#b4141e]/15 text-[#f1c3c7]"
                  : "border border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-[#090909] p-6">
          <div className={tab === "catalog" ? "block" : "hidden"}>
            <CatalogTab refreshKey={refreshKey} />
          </div>
          <div className={tab === "redemptions" ? "block" : "hidden"}>
            <RedemptionsTab refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </main>
  );
}
