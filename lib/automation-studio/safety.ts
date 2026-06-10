import type { AutomationOutputSpec } from "@/lib/automation-studio/types";

export const FORBIDDEN_AUTOMATION_OUTPUT_KINDS = [
  "email_send",
  "push_notification",
  "publish_post",
  "credit_adjustment",
  "membership_change",
  "subscription_change",
  "stripe_action",
  "data_delete",
] as const;

const FORBIDDEN_ACTION_PATTERNS = [
  /\bexecute\b/i,
  /\bsend email\b/i,
  /\bsend push\b/i,
  /\bpublish\b/i,
  /\bcharge\b/i,
  /\brefund\b/i,
  /\bdelete\b/i,
];

export function assertSafeAutomationOutputs(outputs: AutomationOutputSpec[]): void {
  for (const output of outputs) {
    if ((FORBIDDEN_AUTOMATION_OUTPUT_KINDS as readonly string[]).includes(output.kind)) {
      throw new Error(`Forbidden automation output kind: ${output.kind}`);
    }

    const serialized = JSON.stringify(output);
    for (const pattern of FORBIDDEN_ACTION_PATTERNS) {
      if (pattern.test(serialized)) {
        throw new Error("Automation output contains forbidden execution language.");
      }
    }
  }
}

export function automationOutputsAreDraftOnly(outputs: AutomationOutputSpec[]): boolean {
  return outputs.every((output) =>
    ["action_draft", "operations_plan", "owner_note", "weekly_report"].includes(output.kind),
  );
}
