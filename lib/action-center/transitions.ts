import type { NexusActionStatus } from "@/lib/action-center/types";

export type NexusActionMutation = "approve" | "reject" | "execute" | "edit" | "submit";

const TRANSITIONS: Record<NexusActionMutation, { from: NexusActionStatus[]; to: NexusActionStatus }> =
  {
    submit: {
      from: ["draft"],
      to: "pending_approval",
    },
    approve: {
      from: ["draft", "pending_approval"],
      to: "approved",
    },
    reject: {
      from: ["draft", "pending_approval", "approved"],
      to: "rejected",
    },
    execute: {
      from: ["approved"],
      to: "executed",
    },
    edit: {
      from: ["draft", "pending_approval", "approved"],
      to: "pending_approval",
    },
  };

export function canTransitionActionStatus(
  current: NexusActionStatus,
  mutation: NexusActionMutation,
): boolean {
  return TRANSITIONS[mutation].from.includes(current);
}

export function actionStatusAfterMutation(
  _current: NexusActionStatus,
  mutation: NexusActionMutation,
): NexusActionStatus {
  return TRANSITIONS[mutation].to;
}
