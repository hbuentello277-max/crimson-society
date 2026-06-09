"use client";

import { ExecutiveCommandCenter } from "@/components/nexus/founder/ExecutiveCommandCenter";
import { MorningBriefingCard } from "@/components/nexus/founder/MorningBriefingCard";
import { FounderQuickActions } from "@/components/nexus/founder/FounderQuickActions";
import { useNexusScrollRestoration } from "@/hooks/nexus/useNexusPageState";

export function NexusFounderDashboard() {
  const { ref: scrollRef } = useNexusScrollRestoration("nexus:founder-dashboard");

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto pb-2"
    >
      <ExecutiveCommandCenter />
      <MorningBriefingCard />
      <FounderQuickActions />
    </div>
  );
}
