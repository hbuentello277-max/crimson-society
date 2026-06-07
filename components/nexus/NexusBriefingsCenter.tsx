"use client";

import { useCallback, useState } from "react";
import type { MonthlyOwnerBriefing } from "@/lib/briefings/types";
import type { WeeklyOwnerBriefing } from "@/lib/briefings/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import {
  MonthlyBriefingCard,
  monthlyBriefingPlainText,
} from "@/components/nexus/briefings/MonthlyBriefingCard";
import {
  WeeklyBriefingCard,
  weeklyBriefingPlainText,
} from "@/components/nexus/briefings/WeeklyBriefingCard";
import { NexusListEmpty, NexusSectionFrame, NexusTabFilter } from "@/components/nexus/NexusShared";
import {
  useNexusScrollRestoration,
  useNexusStoredState,
} from "@/hooks/nexus/useNexusPageState";

type WeeklyPayload = { ok?: boolean; briefing?: WeeklyOwnerBriefing };
type MonthlyPayload = { ok?: boolean; briefing?: MonthlyOwnerBriefing };

type BriefingTab = "weekly" | "monthly";

async function copyPlainText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function NexusBriefingsCenter() {
  const scrollRef = useNexusScrollRestoration("nexus:briefings");
  const [tab, setTab] = useNexusStoredState<BriefingTab>("nexus:briefings:tab", "weekly");
  const [weeklyCopyState, setWeeklyCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [monthlyCopyState, setMonthlyCopyState] = useState<"idle" | "copied" | "error">("idle");

  const weeklyQuery = useNexusFetch<WeeklyPayload>(
    tab === "weekly" ? "/api/nexus/briefings/weekly" : null,
  );
  const monthlyQuery = useNexusFetch<MonthlyPayload>(
    tab === "monthly" ? "/api/nexus/briefings/monthly" : null,
  );

  const loading = tab === "weekly" ? weeklyQuery.loading : monthlyQuery.loading;
  const error = tab === "weekly" ? weeklyQuery.error : monthlyQuery.error;

  const refresh = async () => {
    await weeklyQuery.refresh();
    if (tab === "monthly") await monthlyQuery.refresh();
  };

  const weekly = weeklyQuery.data?.briefing;
  const monthly = monthlyQuery.data?.briefing;

  const handleCopyWeekly = useCallback(async () => {
    if (!weekly) return;
    try {
      await copyPlainText(weeklyBriefingPlainText(weekly));
      setWeeklyCopyState("copied");
      window.setTimeout(() => setWeeklyCopyState("idle"), 2000);
    } catch {
      setWeeklyCopyState("error");
      window.setTimeout(() => setWeeklyCopyState("idle"), 2000);
    }
  }, [weekly]);

  const handleCopyMonthly = useCallback(async () => {
    if (!monthly) return;
    try {
      await copyPlainText(monthlyBriefingPlainText(monthly));
      setMonthlyCopyState("copied");
      window.setTimeout(() => setMonthlyCopyState("idle"), 2000);
    } catch {
      setMonthlyCopyState("error");
      window.setTimeout(() => setMonthlyCopyState("idle"), 2000);
    }
  }, [monthly]);

  return (
    <div ref={scrollRef}>
      <NexusSectionFrame
        title="Owner Briefings"
        description="Plain-language weekly and monthly summaries built from Nexus reports. Deterministic Mark I — no AI or automation."
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
        {!loading ? (
          <>
            <div className="rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/5 p-4 text-sm text-zinc-300">
              Briefings answer what changed, what grew, what slowed down, what made money, what
              needs attention, and what to focus on next — using existing Phase 13 report data only.
            </div>

            <NexusTabFilter
              tabs={[
                { id: "weekly" as const, label: "Weekly" },
                { id: "monthly" as const, label: "Monthly" },
              ]}
              value={tab}
              onChange={setTab}
            />

            {tab === "weekly" && weekly ? (
              <WeeklyBriefingCard
                briefing={weekly}
                onCopy={() => void handleCopyWeekly()}
                copyState={weeklyCopyState}
              />
            ) : null}

            {tab === "weekly" && !weekly && !error ? (
              <NexusListEmpty
                title="Weekly briefing unavailable"
                description="Could not generate the weekly owner briefing."
              />
            ) : null}

            {tab === "monthly" && monthly ? (
              <MonthlyBriefingCard
                briefing={monthly}
                onCopy={() => void handleCopyMonthly()}
                copyState={monthlyCopyState}
              />
            ) : null}

            {tab === "monthly" && !monthly && !error ? (
              <NexusListEmpty
                title="Monthly briefing unavailable"
                description="Could not generate the monthly owner briefing."
              />
            ) : null}
          </>
        ) : null}
      </NexusSectionFrame>
    </div>
  );
}
