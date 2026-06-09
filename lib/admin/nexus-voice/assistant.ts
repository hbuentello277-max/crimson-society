import type { SupabaseClient } from "@supabase/supabase-js";
import { buildActionDraft } from "@/lib/admin/nexus-voice/action-tools";
import { createNexusVoiceConfirmationToken } from "@/lib/admin/nexus-voice/confirmation";
import {
  formatNexusVoiceConfirmSuccess,
  formatNexusVoiceResponse,
} from "@/lib/admin/nexus-voice/formatters";
import {
  canAccessVoiceNavigation,
  formatNexusVoiceNavigationDenied,
  formatNexusVoiceNavigationResponse,
  resolveNexusVoiceNavigation,
} from "@/lib/admin/nexus-voice/navigation";
import { NEXUS_VOICE_HELP_RESPONSE, resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";
import { runNexusVoiceTool } from "@/lib/admin/nexus-voice/tools";
import type {
  NexusVoiceAssistantResult,
  NexusVoiceConfirmToolName,
  NexusVoiceToolName,
} from "@/lib/admin/nexus-voice/types";
import {
  NEXUS_VOICE_ACTION_CENTER_TOOLS,
  NEXUS_VOICE_CONFIRM_TOOLS,
  NEXUS_VOICE_CROSS_SYSTEM_TOOLS,
  NEXUS_VOICE_EXECUTIVE_COMMAND_TOOLS,
  NEXUS_VOICE_FOUNDER_TOOLS,
  NEXUS_VOICE_OPERATIONS_PLANNER_TOOLS,
} from "@/lib/admin/nexus-voice/types";

export { resolveNexusVoiceTool, NEXUS_VOICE_HELP_RESPONSE } from "@/lib/admin/nexus-voice/routing";
export { formatNexusVoiceResponse } from "@/lib/admin/nexus-voice/formatters";

function isConfirmTool(tool: NexusVoiceToolName): tool is NexusVoiceConfirmToolName {
  return (NEXUS_VOICE_CONFIRM_TOOLS as readonly string[]).includes(tool);
}

export type NexusVoiceAssistantOptions = {
  isPlatformOwner?: boolean;
};

export async function runNexusVoiceAssistant(
  transcript: string,
  admin: SupabaseClient,
  userId: string,
  options: NexusVoiceAssistantOptions = {},
): Promise<NexusVoiceAssistantResult> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      transcript: "",
      response: "I did not catch a command. Tap NEXUS Voice and try again.",
      tool: null,
    };
  }

  const navigation = resolveNexusVoiceNavigation(trimmed);
  if (navigation) {
    if (!canAccessVoiceNavigation(navigation, options.isPlatformOwner === true)) {
      return {
        transcript: trimmed,
        response: formatNexusVoiceNavigationDenied(navigation.label),
        tool: null,
      };
    }

    return {
      transcript: trimmed,
      response: formatNexusVoiceNavigationResponse(navigation.label),
      tool: null,
      navigation: {
        href: navigation.href,
        label: navigation.label,
      },
    };
  }

  const tool = resolveNexusVoiceTool(trimmed);
  if (!tool) {
    return {
      transcript: trimmed,
      response: NEXUS_VOICE_HELP_RESPONSE,
      tool: null,
    };
  }

  if (
    (NEXUS_VOICE_FOUNDER_TOOLS as readonly string[]).includes(tool) ||
    (NEXUS_VOICE_CROSS_SYSTEM_TOOLS as readonly string[]).includes(tool) ||
    (NEXUS_VOICE_OPERATIONS_PLANNER_TOOLS as readonly string[]).includes(tool) ||
    (NEXUS_VOICE_ACTION_CENTER_TOOLS as readonly string[]).includes(tool) ||
    (NEXUS_VOICE_EXECUTIVE_COMMAND_TOOLS as readonly string[]).includes(tool)
  ) {
    if (options.isPlatformOwner !== true) {
      return {
        transcript: trimmed,
        response: "Founder copilot and Action Center are available to platform owners only.",
        tool: null,
      };
    }
  }

  if (isConfirmTool(tool)) {
    const draft = buildActionDraft(tool, trimmed);
    const { token, expiresAt } = createNexusVoiceConfirmationToken({
      userId,
      tool,
      draft: draft.draft,
    });

    return {
      transcript: trimmed,
      response: `I prepared "${draft.summary}". Review the action and tap Confirm to execute, or Cancel to discard.`,
      tool,
      requiresConfirmation: true,
      pendingConfirmation: {
        token,
        tool,
        label: draft.label,
        summary: draft.summary,
        details: draft.details,
        expiresAt,
      },
    };
  }

  const actionResult = await runNexusVoiceTool(tool, admin, {
    transcript: trimmed,
    ownerId: options.isPlatformOwner ? userId : undefined,
  });

  return {
    transcript: trimmed,
    response: formatNexusVoiceResponse(tool, actionResult),
    actionResult,
    tool,
  };
}

export async function confirmNexusVoiceAction(
  admin: SupabaseClient,
  userId: string,
  tool: NexusVoiceConfirmToolName,
  draft: Record<string, unknown>,
): Promise<NexusVoiceAssistantResult> {
  const { executeConfirmedAction } = await import("@/lib/admin/nexus-voice/action-tools");
  const actionResult = await executeConfirmedAction(admin, userId, tool, draft);

  return {
    transcript: "",
    response: formatNexusVoiceConfirmSuccess(tool, actionResult),
    actionResult,
    tool,
    requiresConfirmation: false,
  };
}
