"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/admin/nexus", label: "Overview", exact: true },
  { href: "/admin/nexus/system-health", label: "System Health" },
  { href: "/admin/nexus/mission-health", label: "Mission Health" },
  { href: "/admin/nexus/metrics", label: "Metrics" },
  { href: "/admin/nexus/alerts", label: "Alerts" },
  { href: "/admin/nexus/incidents", label: "Incidents" },
  { href: "/admin/nexus/observations", label: "Observations" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NexusShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+2rem)] md:px-6 md:pb-10 md:pt-10">
        <div className="flex flex-col gap-4 border-b border-[#b4141e]/20 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Project Nexus</p>
            <h1 className="mt-2 font-serif text-3xl text-white md:text-4xl">Command Center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Operational brain of Crimson Society — live health, triage, and intelligence.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#b4141e]/40 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
          >
            Admin Control Room
          </Link>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition ${
                  active
                    ? "border-[#b4141e]/60 bg-[#b4141e]/15 text-[#f1c3c7]"
                    : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
