"use client";

import type { ReactNode } from "react";
import type {
  OperatorExecutionWithAction,
  OperatorReadyAction,
} from "@/lib/operator/types";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import { useNexusPost } from "@/hooks/nexus/useNexusPost";
import { ExecutionHistory } from "@/components/nexus/operator/ExecutionHistory";
import { ExecutionQueue } from "@/components/nexus/operator/ExecutionQueue";
import { OperatorActionCard } from "@/components/nexus/operator/OperatorActionCard";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";

type OperatorPayload = {
  ok?: boolean;
  collected_at?: string;
  ready?: OperatorReadyAction[];
  running?: OperatorExecutionWithAction[];
  completed?: OperatorExecutionWithAction[];
  failed?: OperatorExecutionWithAction[];
  history?: OperatorExecutionWithAction[];
};

function OperatorSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function NexusOperatorCenter() {
  const { data, error, loading, refresh } = useNexusFetch<OperatorPayload>("/api/nexus/operator");
  const { post, pendingKey } = useNexusPost();

  async function executeAction(automationActionId: string) {
    const result = await post<{ execution: unknown }>(
      `/api/nexus/operator/execute/${automationActionId}`,
      {},
      `${automationActionId}-execute`,
    );
    if (result.ok) {
      await refresh();
    }
  }

  return (
    <NexusSectionFrame
      title="Operator"
      description="Low-risk Nexus execution layer. Approved automation actions only — approval does not execute; you must explicitly run each task."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      {!loading ? (
        <div className="min-w-0 space-y-8 overflow-x-hidden">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
            Operator runs safe internal refreshes only. No Stripe changes, no user mutations, no
            deploys, no messaging, and no autonomous background execution.
          </div>

          <OperatorSection
            title="Approved Actions Ready to Execute"
            description="Approved automation items mapped to allowed operator tasks"
          >
            {(data?.ready ?? []).length === 0 ? (
              <NexusListEmpty
                title="Nothing ready to execute"
                description="Approve an eligible automation action in Automation, then return here to execute it."
              />
            ) : (
              <div className="space-y-3">
                {(data?.ready ?? []).map((item) => (
                  <OperatorActionCard
                    key={item.automation_action.id}
                    item={item}
                    pendingKey={pendingKey}
                    onExecute={(id) => void executeAction(id)}
                  />
                ))}
              </div>
            )}
          </OperatorSection>

          <OperatorSection
            title="Running Executions"
            description="Queued or in-progress operator tasks"
          >
            <ExecutionQueue
              items={data?.running ?? []}
              emptyTitle="No running executions"
              emptyDescription="Execute an approved action to start a low-risk operator task."
            />
          </OperatorSection>

          <OperatorSection
            title="Completed Executions"
            description="Successfully finished operator tasks"
          >
            <ExecutionQueue
              items={data?.completed ?? []}
              emptyTitle="No completed executions"
              emptyDescription="Completed operator runs will appear here."
            />
          </OperatorSection>

          <OperatorSection
            title="Failed Executions"
            description="Operator tasks that did not complete successfully"
          >
            <ExecutionQueue
              items={data?.failed ?? []}
              emptyTitle="No failed executions"
              emptyDescription="Failed operator runs will appear here with error details."
            />
          </OperatorSection>

          <OperatorSection
            title="Execution History"
            description="Full operator audit trail for this console"
          >
            <ExecutionHistory items={data?.history ?? []} />
          </OperatorSection>
        </div>
      ) : null}
    </NexusSectionFrame>
  );
}
