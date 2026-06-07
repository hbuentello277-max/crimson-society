import type { AutomationActionSummaryRow } from "@/lib/automation/types";
import type {
  NexusAutomationActionType,
  NexusAutomationStatus,
} from "@/lib/nexus/constants";

export function filterAutomationActions(
  actions: AutomationActionSummaryRow[],
  filters: {
    status: NexusAutomationStatus | "all";
    actionType: NexusAutomationActionType | "all";
  },
) {
  return actions.filter((action) => {
    if (filters.status !== "all" && action.status !== filters.status) {
      return false;
    }
    if (filters.actionType !== "all" && action.action_type !== filters.actionType) {
      return false;
    }
    return true;
  });
}
