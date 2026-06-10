import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAutomationRule,
  listAutomationRules,
  listAutomationTriggers,
  updateAutomationRule,
} from "@/lib/automation-studio/manager";
import {
  buildAutomationRuleDraftSummary,
  parseAutomationRuleName,
  parseAutomationStatusChange,
  parseAutomationTemplateId,
} from "@/lib/automation-studio/voice";
import type {
  NexusVoiceActionResult,
  NexusVoiceAutomationStudioToolName,
} from "@/lib/admin/nexus-voice/types";

export async function runNexusAutomationStudioVoiceTool(
  tool: NexusVoiceAutomationStudioToolName,
  admin: SupabaseClient,
  options: { ownerId: string },
): Promise<NexusVoiceActionResult> {
  switch (tool) {
    case "getAutomationTriggered": {
      const triggers = await listAutomationTriggers(admin, 10);
      const pending = triggers.filter((trigger) => trigger.status === "needs_approval");
      return {
        tool,
        data: {
          triggers: pending,
          count: pending.length,
        },
      };
    }
    default:
      throw new Error(`Unsupported automation studio tool: ${tool}`);
  }
}

export async function executeAutomationStudioConfirmedAction(
  admin: SupabaseClient,
  userId: string,
  tool: "prepareAutomationRuleDraft" | "updateAutomationRuleStatus",
  draft: Record<string, unknown>,
): Promise<NexusVoiceActionResult> {
  switch (tool) {
    case "prepareAutomationRuleDraft": {
      const templateId =
        typeof draft.template_id === "string" ? draft.template_id : "community_growth";
      const rule = await createAutomationRule(admin, userId, {
        template_id: templateId,
        name: typeof draft.name === "string" ? draft.name : undefined,
        status: "draft",
      });
      return {
        tool,
        data: {
          rule,
          message:
            "Automation rule draft created in Automation Studio. Enable it when you want NEXUS to monitor conditions.",
        },
      };
    }
    case "updateAutomationRuleStatus": {
      const status = draft.status;
      const ruleName = typeof draft.rule_name === "string" ? draft.rule_name : null;
      if (status !== "active" && status !== "paused" && status !== "disabled") {
        throw new Error("Invalid automation status.");
      }

      const rules = await listAutomationRules(admin, 50);
      const target =
        (ruleName
          ? rules.find((rule) => rule.name.toLowerCase().includes(ruleName.toLowerCase()))
          : null) ?? rules.find((rule) => rule.status !== "disabled");

      if (!target) {
        throw new Error("No matching automation rule found.");
      }

      const rule = await updateAutomationRule(admin, userId, target.id, { status });
      return {
        tool,
        data: {
          rule,
          message: `Automation rule "${rule.name}" is now ${rule.status}.`,
        },
      };
    }
    default:
      throw new Error("Unsupported automation studio confirmed action.");
  }
}

export function buildAutomationStudioActionDraft(
  tool: "prepareAutomationRuleDraft" | "updateAutomationRuleStatus",
  transcript: string,
) {
  switch (tool) {
    case "prepareAutomationRuleDraft": {
      const templateId = parseAutomationTemplateId(transcript);
      const summary = buildAutomationRuleDraftSummary(templateId);
      const draft = {
        template_id: templateId,
        name: summary,
        status: "draft",
      };
      return {
        tool,
        label: "Create automation rule draft",
        summary,
        details: draft,
        draft,
      };
    }
    case "updateAutomationRuleStatus": {
      const change = parseAutomationStatusChange(transcript);
      if (!change) {
        throw new Error("Could not determine automation status change.");
      }
      const ruleName = parseAutomationRuleName(transcript);
      const draft = {
        status: change.status,
        rule_name: ruleName,
      };
      return {
        tool,
        label: change.label,
        summary: `${change.label}${ruleName ? ` for "${ruleName}"` : ""}`,
        details: draft,
        draft,
      };
    }
    default:
      throw new Error("Unsupported automation studio draft action.");
  }
}
