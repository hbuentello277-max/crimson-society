"use client";

import Link from "next/link";

const ACTIONS = [
  { href: "/admin/nexus#executive-command-center", label: "Executive" },
  { href: "/admin/nexus/actions", label: "Actions" },
  { href: "/admin/nexus/overview", label: "Overview" },
  { href: "/admin/nexus/reports", label: "Reports" },
  { href: "/admin/nexus/intelligence", label: "Intelligence" },
  { href: "/admin/nexus/alerts", label: "Alerts" },
  { href: "/admin/nexus/mission-health", label: "Platform Health" },
  { href: "/admin/nexus/mission-control", label: "Platform Status" },
] as const;

export function FounderQuickActions() {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Quick Actions</p>
        <p className="mt-1 text-xs text-zinc-500">Jump to command modules</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-xl border border-[#b4141e]/25 bg-black/40 px-3 py-3 text-center text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:border-[#b4141e]/50 hover:bg-[#b4141e]/10"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
