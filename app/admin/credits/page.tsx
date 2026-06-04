"use client";

import Link from "next/link";
import { useState } from "react";
import { AdjustmentsTab } from "@/components/admin/credits/AdjustmentsTab";
import { BalancesTab } from "@/components/admin/credits/BalancesTab";
import { EconomyTab } from "@/components/admin/credits/EconomyTab";
import { LedgerTab } from "@/components/admin/credits/LedgerTab";
import { ReferralsTab } from "@/components/admin/credits/ReferralsTab";

const TABS = [
  { id: "economy", label: "Economy" },
  { id: "ledger", label: "Ledger" },
  { id: "balances", label: "Balances" },
  { id: "referrals", label: "Referrals" },
  { id: "adjustments", label: "Adjustments" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminCreditsPage() {
  const [tab, setTab] = useState<TabId>("economy");

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500/70">Control Room</p>
            <h1 className="mt-3 text-4xl font-light tracking-tight">Crimson Credits</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Monitor the economy, ledger, balances, referrals, and manual adjustments.
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
          {tab === "economy" && <EconomyTab />}
          {tab === "ledger" && <LedgerTab />}
          {tab === "balances" && <BalancesTab />}
          {tab === "referrals" && <ReferralsTab />}
          {tab === "adjustments" && <AdjustmentsTab />}
        </div>
      </div>
    </main>
  );
}
