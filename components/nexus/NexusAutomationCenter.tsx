"use client";

import { useMemo } from "react";
import type { AutomationActionSummaryRow } from "@/lib/automation/types";
import type {
  NexusAutomationActionType,
  NexusAutomationStatus,
} from "@/lib/nexus/constants";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusMutation } from "@/hooks/nexus/useNexusMutation";
import {
  useNexusScrollRestoration,
  useNexusStoredState,
} from "@/hooks/nexus/useNexusPageState";
import { AutomationFilters } from "@/components/nexus/automation/AutomationFilters";
import { filterAutomationActions } from "@/lib/automation/filters";
import { AutomationCard } from "@/components/nexus/automation/AutomationCard";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";

type AutomationPayload = {
  ok?: boolean;
  collected_at?: string;
  generation?: {
    ok: boolean;
    actions_created: number;
    actions_skipped: number;
    drafts_considered: number;
  };
  counts?: Partial<Record<NexusAutomationStatus | "all", number>>;
  counts_by_type?: Partial<Record<NexusAutomationActionType, number>>;
  actions?: AutomationActionSummaryRow[];
};

export function NexusAutomationCenter() {
  const { ref: scrollRef } = useNexusScrollRestoration("nexus:automation");
  const [status, setStatus] = useNexusStoredState<NexusAutomationStatus | "all">(
    "nexus:automation:status",
    "proposed",
  );
  const [actionType, setActionType] = useNexusStoredState<NexusAutomationActionType | "all">(
    "nexus:automation:action-type",
    "all",
  );
  const { data, error, loading, refresh } = useNexusFetch<AutomationPayload>(
    "/api/nexus/automation?limit=120",
  );
  const { mutate, pendingKey } = useNexusMutation();

  const actions = data?.actions ?? [];
  const filtered = useMemo(
    () => filterAutomationActions(actions, { status, actionType }),
    [actions, status, actionType],
  );

  async function runAction(id: string, action: "approve" | "reject" | "archive") {
    const result = await mutate(`/api/nexus/automation/${id}`, { action }, `${id}-${action}`);
    if (result.ok) {
      await refresh();
    }
  }

  return (
    <div ref={scrollRef}>
      <NexusSectionFrame
        title="Automation"
        description="Controlled automation framework for Crimson Society. Proposed actions only — every step requires explicit owner approval. Mark I — no execution engine."
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
        {!loading ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
              Automation prepares recommendations from Planning, Correlations, Intelligence, Commands,
              Reports, and Briefings. Approving an action means you agree it is worthwhile — nothing
              executes automatically.
            </div>

          {data?.generation ? (
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Generation · {data.generation.drafts_considered} evaluated ·{" "}
              {data.generation.actions_created} created · {data.generation.actions_skipped} skipped
            </p>
          ) : null}

          <AutomationFilters
            status={status}
            actionType={actionType}
            counts={data?.counts ?? {}}
            countsByType={data?.counts_by_type ?? {}}
            onStatusChange={setStatus}
            onActionTypeChange={setActionType}
          />

          {filtered.length === 0 ? (
            <NexusListEmpty
              title="No automation actions"
              description="Refresh to generate proposed actions from current Nexus signals."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((action) => (
                <AutomationCard
                  key={action.id}
                  action={action}
                  pendingKey={pendingKey}
                  onApprove={(id) => void runAction(id, "approve")}
                  onReject={(id) => void runAction(id, "reject")}
                  onArchive={(id) => void runAction(id, "archive")}
                />
              ))}
            </div>
          )}
          </div>
        ) : null}
      </NexusSectionFrame>
    </div>
  );
}
