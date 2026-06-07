import type { CorrelationItem } from "@/lib/correlations/types";
import type { MemoryEntrySummaryRow } from "@/lib/memory/types";
import type { ReportContext } from "@/lib/reports/context";
import type { RepeatingPattern } from "@/lib/operational-intelligence/types";
import { clampScore } from "@/lib/operational-intelligence/scoring";

export function buildRepeatingPatterns(input: {
  report: ReportContext;
  correlations: CorrelationItem[];
  memoryEntries: MemoryEntrySummaryRow[];
}): RepeatingPattern[] {
  const patterns: RepeatingPattern[] = [];

  const engagementCorrelation = input.correlations.find(
    (item) =>
      item.category === "engagement" &&
      (item.title.toLowerCase().includes("momentum") ||
        item.title.toLowerCase().includes("posts") ||
        item.title.toLowerCase().includes("meet")),
  );

  if (engagementCorrelation) {
    patterns.push({
      id: "pattern:meet-messaging",
      title: "Meet activity leads to messaging growth",
      summary:
        "Historical Nexus correlations show meet activity and messaging often rise together.",
      evidence: [
        engagementCorrelation.summary,
        ...engagementCorrelation.signals.slice(0, 2).map(
          (signal) => `${signal.label}: ${signal.value} (${signal.direction})`,
        ),
      ],
      confidence_score: engagementCorrelation.confidence_score,
      category: "engagement",
      related_routes: ["/admin/nexus/correlations", "/admin/nexus/metrics"],
    });
  }

  const deploymentMemory = input.memoryEntries.filter(
    (entry) => entry.entry_type === "deployment",
  );
  const degradedWorkflows = (input.report.mission.workflows ?? []).filter((workflow) =>
    ["degraded", "impaired", "critical", "failing"].includes(
      workflow.workflow_status.toLowerCase(),
    ),
  ).length;

  if (deploymentMemory.length > 0 && degradedWorkflows > 0) {
    patterns.push({
      id: "pattern:deployment-workflow",
      title: "Workflow degradation follows deployment events",
      summary:
        "Recent deployment memory entries coincide with degraded workflow signals in mission health.",
      evidence: [
        `${deploymentMemory.length} deployment memory record(s) in recent history`,
        `${degradedWorkflows} workflow(s) currently degraded`,
        deploymentMemory[0]?.title ?? "Recent deployment recorded",
      ],
      confidence_score: clampScore(70 + deploymentMemory.length * 3),
      category: "operations",
      related_routes: ["/admin/nexus/memory", "/admin/nexus/mission-health"],
    });
  }

  const incidentMemory = input.memoryEntries.filter(
    (entry) => entry.entry_type === "incident" || entry.entry_type === "alert",
  );
  if (incidentMemory.length >= 2) {
    patterns.push({
      id: "pattern:incident-recurrence",
      title: "Incident recurrence in operational history",
      summary:
        "Multiple incident or alert memory entries suggest recurring operational friction.",
      evidence: incidentMemory.slice(0, 3).map((entry) => entry.title),
      confidence_score: clampScore(60 + incidentMemory.length * 5),
      category: "risk",
      related_routes: ["/admin/nexus/incidents", "/admin/nexus/memory"],
    });
  }

  const revenueCorrelation = input.correlations.find(
    (item) => item.category === "revenue" || item.category === "blackcard",
  );
  if (revenueCorrelation) {
    patterns.push({
      id: `pattern:revenue:${revenueCorrelation.id}`,
      title: "Revenue-linked activity pattern",
      summary: revenueCorrelation.summary,
      evidence: revenueCorrelation.signals.map(
        (signal) => `${signal.label}: ${signal.value}`,
      ),
      confidence_score: revenueCorrelation.confidence_score,
      category: "revenue",
      related_routes: revenueCorrelation.related_routes,
    });
  }

  const growthCorrelation = input.correlations.find((item) => item.category === "growth");
  if (growthCorrelation) {
    patterns.push({
      id: `pattern:growth:${growthCorrelation.id}`,
      title: "Growth co-movement pattern",
      summary: growthCorrelation.summary,
      evidence: growthCorrelation.signals.slice(0, 3).map(
        (signal) => `${signal.label}: ${signal.direction}`,
      ),
      confidence_score: growthCorrelation.confidence_score,
      category: "growth",
      related_routes: growthCorrelation.related_routes,
    });
  }

  return patterns.slice(0, 8);
}
