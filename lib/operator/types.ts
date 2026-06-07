import type { AutomationActionDbRow } from "@/lib/automation/types";
import type {
  NexusOperatorExecutionStatus,
  NexusOperatorExecutionType,
} from "@/lib/nexus/constants";
import { NEXUS_OPERATOR_EXECUTION_TYPES } from "@/lib/nexus/constants";

export type OperatorExecutionDbRow = {
  id: string;
  automation_action_id: string;
  execution_type: NexusOperatorExecutionType;
  status: NexusOperatorExecutionStatus;
  started_at: string | null;
  completed_at: string | null;
  executed_by: string | null;
  result: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type OperatorExecutionProfile = {
  execution_type: NexusOperatorExecutionType;
  label: string;
  safe_because: string;
  will_do: string[];
  will_not_do: string[];
};

export type OperatorReadyAction = {
  automation_action: AutomationActionDbRow;
  execution_type: NexusOperatorExecutionType;
  profile: OperatorExecutionProfile;
};

export type OperatorExecutionWithAction = {
  execution: OperatorExecutionDbRow;
  automation_action: AutomationActionDbRow | null;
  profile: OperatorExecutionProfile;
};

export type OperatorDashboard = {
  collected_at: string;
  ready: OperatorReadyAction[];
  running: OperatorExecutionWithAction[];
  completed: OperatorExecutionWithAction[];
  failed: OperatorExecutionWithAction[];
  history: OperatorExecutionWithAction[];
};

export type ExecuteOperatorResult =
  | { ok: true; execution: OperatorExecutionDbRow; run_ok: boolean; run_error?: string }
  | { ok: false; error: string };

const EXECUTION_TYPE_SET = new Set<string>(NEXUS_OPERATOR_EXECUTION_TYPES);

export function isAllowedOperatorExecutionType(
  value: string,
): value is NexusOperatorExecutionType {
  return EXECUTION_TYPE_SET.has(value);
}

export const OPERATOR_EXECUTION_PROFILES: Record<
  NexusOperatorExecutionType,
  OperatorExecutionProfile
> = {
  refresh_health: {
    execution_type: "refresh_health",
    label: "Refresh Nexus Health",
    safe_because:
      "Runs read-only infrastructure probes and updates Nexus health snapshots only.",
    will_do: [
      "Probe Supabase, Stripe, GitHub, Vercel, Resend, and app health endpoints",
      "Update Nexus integration health records",
    ],
    will_not_do: [
      "Modify Stripe subscriptions or payments",
      "Deploy to Vercel or push to GitHub",
      "Change user accounts or member content",
    ],
  },
  refresh_metrics: {
    execution_type: "refresh_metrics",
    label: "Refresh Metrics",
    safe_because: "Collects operational metrics into Nexus snapshot tables only.",
    will_do: [
      "Roll up growth, revenue, Blackcard, and activity metrics",
      "Write metric snapshots to Nexus tables",
    ],
    will_not_do: [
      "Change subscriptions, inventory, or shop data",
      "Create posts, meets, or messages",
      "Modify member profiles",
    ],
  },
  refresh_mission: {
    execution_type: "refresh_mission",
    label: "Refresh Mission Workflows",
    safe_because: "Recomputes workflow health scores inside Nexus only.",
    will_do: [
      "Refresh mission workflow health snapshots",
      "Update workflow status records in Nexus",
    ],
    will_not_do: [
      "Change live workflow behavior for members",
      "Deploy code or alter infrastructure",
      "Send notifications or messages",
    ],
  },
  refresh_intelligence: {
    execution_type: "refresh_intelligence",
    label: "Refresh Intelligence",
    safe_because: "Regenerates deterministic intelligence findings from existing Nexus data.",
    will_do: ["Recompute intelligence items from current metrics and reports context"],
    will_not_do: [
      "Use AI or external inference services",
      "Mutate business entities outside Nexus tables",
      "Send communications",
    ],
  },
  refresh_correlations: {
    execution_type: "refresh_correlations",
    label: "Refresh Correlations",
    safe_because: "Recomputes correlation findings from existing Nexus operational data.",
    will_do: ["Regenerate correlation rules output from current Nexus signals"],
    will_not_do: [
      "Modify member, shop, or payment records",
      "Trigger alerts or commands automatically",
      "Execute approved automation actions",
    ],
  },
  refresh_reports: {
    execution_type: "refresh_reports",
    label: "Refresh Reports",
    safe_because: "Rebuilds executive report summaries from read-only Nexus context.",
    will_do: [
      "Warm weekly and monthly executive report summaries",
      "Refresh report snapshot blocks for owner review",
    ],
    will_not_do: [
      "Publish reports externally",
      "Change billing or membership state",
      "Create community content",
    ],
  },
  refresh_briefings: {
    execution_type: "refresh_briefings",
    label: "Refresh Briefings",
    safe_because: "Rebuilds owner briefing summaries from existing Nexus data.",
    will_do: ["Regenerate weekly and monthly owner briefing summaries"],
    will_not_do: [
      "Send emails or push notifications",
      "Post briefings to members",
      "Modify external systems",
    ],
  },
  refresh_memory: {
    execution_type: "refresh_memory",
    label: "Refresh Memory",
    safe_because: "Generates deduplicated memory entries in Nexus memory tables only.",
    will_do: [
      "Create new Nexus memory entries from operational history",
      "Skip duplicates via metadata dedupe keys",
    ],
    will_not_do: [
      "Delete or edit member-generated content",
      "Change shop, Stripe, or account records",
      "Auto-approve automation actions",
    ],
  },
  refresh_planning: {
    execution_type: "refresh_planning",
    label: "Refresh Planning",
    safe_because: "Recomputes planning objectives, risks, and priorities in memory only.",
    will_do: [
      "Rebuild planning brief, objectives, priorities, risks, and opportunities",
    ],
    will_not_do: [
      "Execute planning recommendations",
      "Schedule background jobs",
      "Mutate business entities",
    ],
  },
  operational_snapshot: {
    execution_type: "operational_snapshot",
    label: "Generate Operational Snapshot",
    safe_because:
      "Combines low-risk Nexus refreshes into one owner-triggered operational snapshot.",
    will_do: [
      "Refresh health, metrics, mission workflows, and executive report summary",
      "Return a consolidated operational snapshot result",
    ],
    will_not_do: [
      "Run full sync side effects like command generation or alert creation",
      "Modify Stripe, users, posts, meets, or shop data",
      "Deploy or write to external APIs",
    ],
  },
};

export function getOperatorExecutionProfile(
  executionType: NexusOperatorExecutionType,
): OperatorExecutionProfile {
  return OPERATOR_EXECUTION_PROFILES[executionType];
}

const NON_EXECUTABLE_TITLE_PATTERNS = [/open war room/i];

export function resolveOperatorExecutionType(
  action: AutomationActionDbRow,
): NexusOperatorExecutionType | null {
  const metadataType = action.metadata.operator_execution_type;
  if (typeof metadataType === "string" && isAllowedOperatorExecutionType(metadataType)) {
    return metadataType;
  }

  if (NON_EXECUTABLE_TITLE_PATTERNS.some((pattern) => pattern.test(action.title))) {
    return null;
  }

  const title = action.title.toLowerCase();

  if (title.includes("weekly briefing") || title.includes("monthly briefing")) {
    return "refresh_briefings";
  }
  if (title.includes("executive report")) {
    return "refresh_reports";
  }
  if (title.includes("workflow degradation") || title.includes("workflow")) {
    return "refresh_mission";
  }
  if (
    title.includes("revenue trend") ||
    title.includes("blackcard growth") ||
    title.includes("engagement")
  ) {
    return "refresh_metrics";
  }

  switch (action.source) {
    case "briefings":
      return "refresh_briefings";
    case "reports":
      return "refresh_reports";
    case "planning":
      return "refresh_planning";
    case "correlations":
      return "refresh_correlations";
    case "intelligence":
      return "refresh_intelligence";
    case "commands":
      return null;
    default:
      break;
  }

  if (action.action_type === "monitoring") {
    return "refresh_health";
  }
  if (action.action_type === "maintenance") {
    return "operational_snapshot";
  }
  if (action.action_type === "reporting") {
    return "refresh_reports";
  }

  return null;
}
