"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NexusLiveIndicator } from "@/components/nexus/NexusShared";

const NAV_ITEMS = [
  { href: "/admin/nexus", label: "Overview", exact: true },
  { href: "/admin/nexus/system-health", label: "Systems" },
  { href: "/admin/nexus/mission-health", label: "Mission" },
  { href: "/admin/nexus/metrics", label: "Metrics" },
  { href: "/admin/nexus/alerts", label: "Alerts" },
  { href: "/admin/nexus/incidents", label: "Incidents" },
  { href: "/admin/nexus/observations", label: "Intel" },
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
    <main className="relative min-h-screen overflow-x-hidden bg-[#020102] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,20,30,0.1),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(180,20,30,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(180,20,30,0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-4 md:px-6 md:pb-8 md:pt-4">
        <header className="sticky top-0 z-20 -mx-3 border-b border-[#b4141e]/30 bg-[#020102]/95 px-3 py-2 backdrop-blur-md sm:-mx-4 sm:px-4 md:static md:mx-0 md:border-b md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/admin"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#b4141e]/45 bg-black/60 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
            >
              <span aria-hidden>←</span>
              Control Room
            </Link>
            <NexusLiveIndicator />
          </div>

          <div className="mt-2 border-l border-[#b4141e]/50 pl-3">
            <p className="text-[9px] uppercase tracking-[0.32em] text-[#e87a82]">Project Nexus</p>
            <h1 className="font-serif text-xl leading-tight text-white sm:text-2xl md:text-3xl">
              Crimson Command Center
            </h1>
          </div>
        </header>

        <nav className="mt-2 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[9px] uppercase tracking-[0.14em] transition ${
                  active
                    ? "border-[#b4141e]/70 bg-[#b4141e]/20 text-[#f1c3c7] shadow-[0_0_10px_rgba(180,20,30,0.2)]"
                    : "border-[#b4141e]/15 text-zinc-500 hover:border-[#b4141e]/40 hover:text-zinc-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 md:mt-4">{children}</div>
      </div>
    </main>
  );
}
