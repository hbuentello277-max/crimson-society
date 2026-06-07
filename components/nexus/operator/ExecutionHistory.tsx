"use client";

import type { OperatorExecutionWithAction } from "@/lib/operator/types";
import { ExecutionRecordCard } from "@/components/nexus/operator/OperatorActionCard";
import { NexusListEmpty } from "@/components/nexus/NexusShared";

export function ExecutionHistory({ items }: { items: OperatorExecutionWithAction[] }) {
  if (items.length === 0) {
    return (
      <NexusListEmpty
        title="No execution history"
        description="Approved automation actions executed through Operator will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ExecutionRecordCard
          key={item.execution.id}
          title={item.profile.label}
          executionTypeLabel={item.execution.execution_type.replaceAll("_", " ")}
          status={item.execution.status}
          startedAt={item.execution.started_at}
          completedAt={item.execution.completed_at}
          automationTitle={item.automation_action?.title}
          errorMessage={
            typeof item.execution.result.error === "string"
              ? item.execution.result.error
              : null
          }
        />
      ))}
    </div>
  );
}
