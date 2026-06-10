"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  NexusNavActionsIcon,
  NexusNavAutomationIcon,
  NexusNavCopilotIcon,
  NexusNavIntelligenceIcon,
  NexusNavOverviewIcon,
} from "@/components/nexus/NexusNavIcons";
import { NexusSystemsDirectory } from "@/components/nexus/NexusSystemsDirectory";
import { NexusVoiceAssistantShell } from "@/components/admin/NexusVoiceAssistantShell";
import { NexusWelcomeBriefing } from "@/components/nexus/founder/NexusWelcomeBriefing";
import { NexusLiveIndicator } from "@/components/nexus/NexusShared";
import { NEXUS_PRIMARY_NAV, isPrimaryNavActive } from "@/lib/nexus/systems-directory";

const PRIMARY_NAV_ICONS = {
  Overview: NexusNavOverviewIcon,
  Copilot: NexusNavCopilotIcon,
  Automation: NexusNavAutomationIcon,
  "Action Center": NexusNavActionsIcon,
  Intelligence: NexusNavIntelligenceIcon,
} as const;

function PrimaryNavLink({
  item,
  pathname,
  variant,
}: {
  item: (typeof NEXUS_PRIMARY_NAV)[number];
  pathname: string;
  variant: "rail" | "chip";
}) {
  const active = isPrimaryNavActive(pathname, item);
  const Icon = PRIMARY_NAV_ICONS[item.label as keyof typeof PRIMARY_NAV_ICONS];

  if (variant === "rail") {
    return (
      <Link
        href={item.href}
        className={`flex min-h-10 items-center gap-2 rounded border-l-2 px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition ${
          active
            ? "border-[#b4141e] bg-[#b4141e]/15 text-[#f1c3c7]"
            : "border-transparent text-zinc-500 hover:border-[#b4141e]/40 hover:bg-[#b4141e]/5 hover:text-zinc-300"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-medium uppercase tracking-[0.08em] transition ${
        active
          ? "border-[#b4141e]/70 bg-[#b4141e]/25 text-[#f1c3c7] shadow-[0_0_12px_rgba(180,20,30,0.18)]"
          : "border-[#b4141e]/20 bg-[#0a0608]/90 text-zinc-400 hover:border-[#b4141e]/40 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {item.label}
    </Link>
  );
}

export function NexusShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mobileCopilot = pathname === "/admin/nexus/copilot";
  const [systemsOpen, setSystemsOpen] = useState(false);

  return (
    <NexusVoiceAssistantShell
      enabled={true}
      floatingClassName={mobileCopilot ? "hidden" : undefined}
    >
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
          {!mobileCopilot ? (
            <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-44 flex-col border-r border-[#b4141e]/25 bg-[#010101]/95 pt-[calc(env(safe-area-inset-top)+3.5rem)] backdrop-blur-md lg:flex">
              <div className="border-b border-[#b4141e]/15 px-3 py-3">
                <p className="text-[9px] uppercase tracking-[0.28em] text-[#e87a82]">Command</p>
                <p className="text-sm font-medium text-white">Center</p>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
                {NEXUS_PRIMARY_NAV.map((item) => (
                  <PrimaryNavLink key={item.href} item={item} pathname={pathname} variant="rail" />
                ))}
                <button
                  type="button"
                  onClick={() => setSystemsOpen(true)}
                  className="mt-1 flex min-h-10 items-center gap-2 rounded border border-[#b4141e]/25 bg-[#b4141e]/5 px-3 py-2 text-left text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/15"
                >
                  <span className="text-xs">☰</span>
                  NEXUS Systems
                </button>
              </nav>
              <div className="border-t border-[#b4141e]/15 p-3">
                <Link
                  href="/admin"
                  className="flex min-h-10 items-center justify-center rounded-lg border border-[#b4141e]/30 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/10"
                >
                  ← Control Room
                </Link>
              </div>
            </aside>
          ) : null}

          <div
            className={`flex min-h-[100dvh] min-w-0 flex-1 flex-col ${mobileCopilot ? "" : "lg:pl-44"}`}
          >
            <header className="sticky top-0 z-40 border-b border-[#b4141e]/30 bg-[#010101]/95 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md sm:px-4 lg:py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Link
                    href="/admin"
                    className="mt-1 inline-flex min-h-10 shrink-0 items-center rounded-lg border border-[#b4141e]/40 bg-black/60 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/10 lg:hidden"
                  >
                    ← Room
                  </Link>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#e87a82] sm:text-xs">
                      Project Nexus
                    </p>
                    <h1 className="mt-0.5 font-serif text-2xl leading-tight text-white sm:text-3xl">
                      Operations Console
                    </h1>
                  </div>
                </div>
                <div className="shrink-0 pt-1">
                  <NexusLiveIndicator />
                </div>
              </div>
              {!mobileCopilot ? (
                <nav className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {NEXUS_PRIMARY_NAV.map((item) => (
                    <PrimaryNavLink key={item.href} item={item} pathname={pathname} variant="chip" />
                  ))}
                  <button
                    type="button"
                    onClick={() => setSystemsOpen(true)}
                    className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-[#b4141e]/30 bg-[#b4141e]/10 px-2.5 py-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[#f1c3c7]"
                  >
                    ☰ Systems
                  </button>
                </nav>
              ) : null}
            </header>

            <div
              className={`flex min-h-0 flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-4 ${
                mobileCopilot ? "pt-1 lg:pt-2" : "py-3 lg:py-4"
              }`}
            >
              {mobileCopilot ? null : <NexusWelcomeBriefing />}
              {children}
            </div>
          </div>
        </div>

        <NexusSystemsDirectory open={systemsOpen} onClose={() => setSystemsOpen(false)} />
      </main>
    </NexusVoiceAssistantShell>
  );
}
