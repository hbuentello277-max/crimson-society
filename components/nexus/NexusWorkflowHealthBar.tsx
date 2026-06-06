"use client";

import { NEXUS_LABELS } from "@/lib/nexus/terminology";

type WorkflowSummary = {
  workflow_status: string;
};

type NexusWorkflowHealthBarProps = {
  score: number | null | undefined;
  status?: string;
  workflows?: WorkflowSummary[];
  segmentCount?: number;
};

function isHealthy(status: string) {
  return ["healthy", "nominal", "operational", "pass"].includes(status.toLowerCase());
}

function isDegraded(status: string) {
  return ["degraded", "impaired", "warning"].includes(status.toLowerCase());
}

function isCritical(status: string) {
  return ["critical", "down", "failing", "error"].includes(status.toLowerCase());
}

function segmentColor(score: number, index: number, total: number) {
  const threshold = ((index + 1) / total) * 100;
  if (score >= threshold) {
    if (score >= 80) return "bg-emerald-400";
    if (score >= 55) return "bg-amber-400";
    return "bg-red-400";
  }
  return "bg-zinc-700/80";
}

export function NexusWorkflowHealthBar({
  score,
  status = "unknown",
  workflows = [],
  segmentCount = 24,
}: NexusWorkflowHealthBarProps) {
  const normalized =
    typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const displayScore = typeof score === "number" && Number.isFinite(score) ? score : "—";

  const healthyCount = workflows.filter((wf) => isHealthy(wf.workflow_status)).length;
  const degradedCount = workflows.filter((wf) => isDegraded(wf.workflow_status)).length;
  const criticalCount = workflows.filter((wf) => isCritical(wf.workflow_status)).length;

  return (
    <div className="w-full min-w-0 space-y-3 overflow-hidden">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-end gap-[2px] sm:gap-[3px]">
          {Array.from({ length: segmentCount }).map((_, index) => (
            <span
              key={index}
              className={`h-6 w-[3px] shrink-0 rounded-sm sm:h-7 sm:w-[4px] ${segmentColor(normalized, index, segmentCount)}`}
            />
          ))}
        </div>
        <p className="shrink-0 text-2xl font-semibold leading-none text-white sm:text-3xl">
          {displayScore}%
        </p>
      </div>

      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {NEXUS_LABELS.workflowHealthScore}
        <span className="ml-2 capitalize text-[#e87a82]">· {status}</span>
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Healthy: {healthyCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Degraded: {degradedCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          Critical: {criticalCount}
        </span>
      </div>
    </div>
  );
}
