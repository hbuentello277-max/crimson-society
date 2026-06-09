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
import {
  buildSessionContextFromResult,
  resolveFollowUpTranscript,
  type NexusVoiceSessionContext,
} from "@/lib/admin/nexus-voice/conversation";
import type {
  NexusVoiceAssistantResult,
  NexusVoiceConfirmToolName,
  NexusVoiceToolName,
} from "@/lib/admin/nexus-voice/types";
import { NEXUS_VOICE_CONFIRM_TOOLS, NEXUS_VOICE_FOUNDER_TOOLS } from "@/lib/admin/nexus-voice/types";

export { resolveNexusVoiceTool, NEXUS_VOICE_HELP_RESPONSE } from "@/lib/admin/nexus-voice/routing";
export { formatNexusVoiceResponse } from "@/lib/admin/nexus-voice/formatters";

function isConfirmTool(tool: NexusVoiceToolName): tool is NexusVoiceConfirmToolName {
  return (NEXUS_VOICE_CONFIRM_TOOLS as readonly string[]).includes(tool);
}

export type NexusVoiceAssistantOptions = {
  isPlatformOwner?: boolean;
  sessionContext?: NexusVoiceSessionContext | null;
};

function withSessionContext(
  transcript: string,
  result: NexusVoiceAssistantResult,
  sessionContext?: NexusVoiceSessionContext | null,
): NexusVoiceAssistantResult {
  return {
    ...result,
    sessionContext: buildSessionContextFromResult(transcript, result, sessionContext ?? null),
  };
}

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

  const effectiveTranscript = resolveFollowUpTranscript(trimmed, options.sessionContext);
  const resolvedTranscript =
    effectiveTranscript !== trimmed ? effectiveTranscript : undefined;

  const navigation = resolveNexusVoiceNavigation(effectiveTranscript);
  if (navigation) {
    if (!canAccessVoiceNavigation(navigation, options.isPlatformOwner === true)) {
    return withSessionContext(trimmed, {
      transcript: trimmed,
      response: formatNexusVoiceNavigationDenied(navigation.label),
      tool: null,
      resolvedTranscript,
    }, options.sessionContext);
  }

    return withSessionContext(trimmed, {
      transcript: trimmed,
      response: formatNexusVoiceNavigationResponse(navigation.label),
      tool: null,
      navigation: {
        href: navigation.href,
        label: navigation.label,
      },
      resolvedTranscript,
    }, options.sessionContext);
  }

  const tool = resolveNexusVoiceTool(effectiveTranscript);
  if (!tool) {
    return withSessionContext(trimmed, {
      transcript: trimmed,
      response: NEXUS_VOICE_HELP_RESPONSE,
      tool: null,
      resolvedTranscript,
    }, options.sessionContext);
  }

  if ((NEXUS_VOICE_FOUNDER_TOOLS as readonly string[]).includes(tool)) {
    if (options.isPlatformOwner !== true) {
      return withSessionContext(trimmed, {
        transcript: trimmed,
        response: "Founder copilot is available to platform owners only.",
        tool: null,
        resolvedTranscript,
      }, options.sessionContext);
    }
  }

  if (isConfirmTool(tool)) {
    const draft = buildActionDraft(tool, effectiveTranscript);
    const { token, expiresAt } = createNexusVoiceConfirmationToken({
      userId,
      tool,
      draft: draft.draft,
    });

    return withSessionContext(trimmed, {
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
      resolvedTranscript,
    }, options.sessionContext);
  }

  const actionResult = await runNexusVoiceTool(tool, admin, { transcript: effectiveTranscript });

  return withSessionContext(trimmed, {
    transcript: trimmed,
    response: formatNexusVoiceResponse(tool, actionResult),
    actionResult,
    tool,
    resolvedTranscript,
  }, options.sessionContext);
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
