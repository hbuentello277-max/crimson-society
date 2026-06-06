"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NexusLiveIndicator } from "@/components/nexus/NexusShared";

const NAV_ITEMS = [
  { href: "/admin/nexus", label: "Operations Overview", short: "OVR", exact: true },
  { href: "/admin/nexus/system-health", label: "Infrastructure", short: "INF" },
  { href: "/admin/nexus/mission-health", label: "User Workflows", short: "WFL" },
  { href: "/admin/nexus/metrics", label: "Metrics", short: "MET" },
  { href: "/admin/nexus/alerts", label: "Alerts", short: "ALT" },
  { href: "/admin/nexus/incidents", label: "Incidents", short: "INC" },
  { href: "/admin/nexus/observations", label: "Insights", short: "INS" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  variant,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
  variant: "rail" | "bar";
}) {
  const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);

  if (variant === "rail") {
    return (
      <Link
        href={item.href}
        className={`block rounded border-l-2 px-2 py-1.5 text-[9px] uppercase tracking-[0.14em] transition ${
          active
            ? "border-[#b4141e] bg-[#b4141e]/15 text-[#f1c3c7]"
            : "border-transparent text-zinc-500 hover:border-[#b4141e]/40 hover:bg-[#b4141e]/5 hover:text-zinc-300"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`shrink-0 rounded border px-2 py-1 text-[8px] uppercase tracking-[0.12em] ${
        active
          ? "border-[#b4141e]/70 bg-[#b4141e]/20 text-[#f1c3c7]"
          : "border-[#b4141e]/15 text-zinc-500"
      }`}
    >
      {item.short}
    </Link>
  );
}

export function NexusShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#010101] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(180,20,30,0.12),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(180,20,30,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(180,20,30,0.7) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative flex min-h-screen">
        <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-36 flex-col border-r border-[#b4141e]/25 bg-[#010101]/95 pt-[calc(env(safe-area-inset-top)+3.5rem)] backdrop-blur-md lg:flex">
          <div className="border-b border-[#b4141e]/15 px-2 py-2">
            <p className="text-[8px] uppercase tracking-[0.28em] text-[#e87a82]">Command</p>
            <p className="text-[9px] font-medium text-white">Rail</p>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} variant="rail" />
            ))}
          </nav>
          <div className="border-t border-[#b4141e]/15 p-2">
            <Link
              href="/admin"
              className="block rounded border border-[#b4141e]/30 px-2 py-1.5 text-center text-[8px] uppercase tracking-[0.14em] text-[#f1c3c7] hover:bg-[#b4141e]/10"
            >
              ← Control Room
            </Link>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-36">
          <header className="sticky top-0 z-40 border-b border-[#b4141e]/30 bg-[#010101]/95 px-2 py-1.5 backdrop-blur-md sm:px-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href="/admin"
                  className="inline-flex shrink-0 items-center rounded border border-[#b4141e]/40 bg-black/60 px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-[#f1c3c7] lg:hidden"
                >
                  ← Room
                </Link>
                <div className="min-w-0 border-l border-[#b4141e]/40 pl-2">
                  <p className="truncate text-[8px] uppercase tracking-[0.24em] text-[#e87a82]">
                    Project Nexus
                  </p>
                  <h1 className="truncate font-serif text-sm leading-tight text-white sm:text-base">
                    Crimson Command Center
                  </h1>
                </div>
              </div>
              <NexusLiveIndicator />
            </div>
            <nav className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} variant="bar" />
              ))}
            </nav>
          </header>

          <div className="min-h-0 flex-1 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-3 lg:py-3">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
