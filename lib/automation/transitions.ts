import type { UpdateAutomationStatusAction } from "@/lib/automation/types";
import type { NexusAutomationStatus } from "@/lib/nexus/constants";

const TRANSITIONS: Record<
  UpdateAutomationStatusAction,
  { from: NexusAutomationStatus[]; to: NexusAutomationStatus }
> = {
  approve: { from: ["proposed"], to: "approved" },
  reject: { from: ["proposed", "approved"], to: "rejected" },
  archive: { from: ["proposed", "approved", "rejected"], to: "archived" },
};

export function canTransitionAutomationStatus(
  from: NexusAutomationStatus,
  action: UpdateAutomationStatusAction,
) {
  return TRANSITIONS[action].from.includes(from);
}

export function automationStatusAfterAction(action: UpdateAutomationStatusAction) {
  return TRANSITIONS[action].to;
}
