"use client";

import { useMemo } from "react";
import type { NexusActionCard, NexusActionCategory, NexusActionStatus } from "@/lib/action-center/types";
import { ACTION_TYPE_LABELS } from "@/lib/action-center/constants";
import { ActionCard } from "@/components/nexus/action-center/ActionCard";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusMutation } from "@/hooks/nexus/useNexusMutation";
import { useNexusScrollRestoration, useNexusStoredState } from "@/hooks/nexus/useNexusPageState";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";

type ActionPayload = {
  ok?: boolean;
  access?: "owner" | "admin";
  counts?: Partial<Record<NexusActionStatus | "all", number>>;
  actions?: NexusActionCard[];
};

const STATUS_OPTIONS: Array<{ value: NexusActionStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "draft", label: "Draft" },
  { value: "executed", label: "Executed" },
  { value: "rejected", label: "Rejected" },
];

const CATEGORY_OPTIONS: Array<{ value: NexusActionCategory | "all"; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "communication", label: "Communication" },
  { value: "marketing", label: "Marketing" },
  { value: "operational", label: "Operational" },
  { value: "growth", label: "Growth" },
];

export function NexusActionCenter() {
  const { ref: scrollRef } = useNexusScrollRestoration("nexus:actions");
  const [status, setStatus] = useNexusStoredState<NexusActionStatus | "all">(
    "nexus:actions:status",
    "pending_approval",
  );
  const [category, setCategory] = useNexusStoredState<NexusActionCategory | "all">(
    "nexus:actions:category",
    "all",
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    params.set("limit", "120");
    return `/api/nexus/actions?${params.toString()}`;
  }, [status, category]);

  const { data, error, loading, refresh } = useNexusFetch<ActionPayload>(query);
  const { mutate, pendingKey, error: mutationError } = useNexusMutation();

  const actions = data?.actions ?? [];
  const isOwner = data?.access !== "admin";

  async function runMutation(
    id: string,
    patch: Record<string, unknown>,
    pendingSuffix: string,
  ) {
    const result = await mutate(`/api/nexus/actions/${id}`, patch, `${id}-${pendingSuffix}`);
    if (result.ok) {
      await refresh();
    }
  }

  return (
    <div ref={scrollRef}>
      <NexusSectionFrame
        title="Action Center"
        description="NEXUS prepares drafts, recommendations, and approval-ready actions from platform data. Nothing executes automatically — every action requires founder review."
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
        {!loading ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
              NEXUS prepares the work for you. Approve, reject, edit, or mark executed manually.
              No automatic posting, emails, push notifications, or credit changes occur from this
              queue.
            </div>

            {!isOwner ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                Admin view: operational drafts only. Approval and execution remain platform-owner
                actions.
              </div>
            ) : null}

            {mutationError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {mutationError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  active={status === option.value}
                  label={`${option.label}${
                    data?.counts?.[option.value] != null ? ` (${data.counts[option.value]})` : ""
                  }`}
                  onClick={() => setStatus(option.value)}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  active={category === option.value}
                  label={option.label}
                  onClick={() => setCategory(option.value)}
                />
              ))}
            </div>

            {actions.length === 0 ? (
              <NexusListEmpty title="No action cards in this view" />
            ) : (
              <div className="space-y-4">
                {actions.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    pending={pendingKey?.startsWith(action.id) === true}
                    onApprove={
                      isOwner
                        ? () => void runMutation(action.id, { action: "approve" }, "approve")
                        : undefined
                    }
                    onReject={
                      isOwner
                        ? () => void runMutation(action.id, { action: "reject" }, "reject")
                        : undefined
                    }
                    onExecute={
                      isOwner
                        ? () => void runMutation(action.id, { action: "execute" }, "execute")
                        : undefined
                    }
                    onEdit={
                      isOwner
                        ? (patch) =>
                            void runMutation(
                              action.id,
                              { action: "edit", ...patch },
                              "edit",
                            )
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Action types include {Object.values(ACTION_TYPE_LABELS).slice(0, 4).join(", ")}, and
              more. Use NEXUS Voice to draft new actions.
            </p>
          </div>
        ) : null}
      </NexusSectionFrame>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${
        active
          ? "border-[#b4141e]/50 bg-[#b4141e]/12 text-[#f1c3c7]"
          : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}
