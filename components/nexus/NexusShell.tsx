"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NexusLiveIndicator } from "@/components/nexus/NexusShared";

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
    <main className="relative min-h-screen overflow-x-hidden bg-[#030203] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,20,30,0.08),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(180,20,30,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(180,20,30,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-5 md:px-6 md:pb-10 md:pt-6">
        <header className="sticky top-[calc(env(safe-area-inset-top))] z-20 -mx-4 border-b border-[#b4141e]/25 bg-[#030203]/95 px-4 pb-4 backdrop-blur-md sm:-mx-5 sm:px-5 md:static md:mx-0 md:border-b md:bg-transparent md:px-0 md:pb-6 md:backdrop-blur-none">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href="/admin"
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[#b4141e]/40 bg-black/50 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/10"
              >
                <span aria-hidden>←</span>
                Control Room
              </Link>
              <NexusLiveIndicator />
            </div>

            <div className="border-l-2 border-[#b4141e]/60 pl-4">
              <p className="text-[10px] uppercase tracking-[0.38em] text-[#e87a82]">Project Nexus</p>
              <h1 className="mt-1 font-serif text-2xl text-white sm:text-3xl md:text-4xl">
                Crimson Command Center
              </h1>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                System overview · Owner operations
              </p>
            </div>
          </div>
        </header>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] transition sm:px-4 ${
                  active
                    ? "border-[#b4141e]/70 bg-[#b4141e]/20 text-[#f1c3c7] shadow-[0_0_12px_rgba(180,20,30,0.2)]"
                    : "border-[#b4141e]/20 text-zinc-400 hover:border-[#b4141e]/45 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 md:mt-8">{children}</div>
      </div>
    </main>
  );
}
