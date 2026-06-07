"use client";

import type {
  NexusAutomationActionType,
  NexusAutomationStatus,
} from "@/lib/nexus/constants";
import {
  NEXUS_AUTOMATION_ACTION_TYPES,
  NEXUS_AUTOMATION_STATUSES,
} from "@/lib/nexus/constants";
import { NexusTabFilter } from "@/components/nexus/NexusShared";

export function AutomationFilters({
  status,
  actionType,
  counts,
  countsByType,
  onStatusChange,
  onActionTypeChange,
}: {
  status: NexusAutomationStatus | "all";
  actionType: NexusAutomationActionType | "all";
  counts: Partial<Record<NexusAutomationStatus | "all", number>>;
  countsByType: Partial<Record<NexusAutomationActionType, number>>;
  onStatusChange: (value: NexusAutomationStatus | "all") => void;
  onActionTypeChange: (value: NexusAutomationActionType | "all") => void;
}) {
  const statusTabs = [
    { id: "all" as const, label: "All", count: counts.all },
    ...NEXUS_AUTOMATION_STATUSES.map((value) => ({
      id: value,
      label: value,
      count: counts[value],
    })),
  ];

  const typeTabs = [
    { id: "all" as const, label: "All Types", count: undefined },
    ...NEXUS_AUTOMATION_ACTION_TYPES.map((value) => ({
      id: value,
      label: value,
      count: countsByType[value],
    })),
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">Status</p>
        <NexusTabFilter tabs={statusTabs} value={status} onChange={onStatusChange} />
      </div>
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">Category</p>
        <NexusTabFilter tabs={typeTabs} value={actionType} onChange={onActionTypeChange} />
      </div>
    </div>
  );
}

