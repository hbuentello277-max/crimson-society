import type { SupabaseClient } from "@supabase/supabase-js";
import { createNexusActionCard } from "@/lib/action-center/manager";
import {
  filterActionsForVoiceQueue,
  getNexusActionQueue,
} from "@/lib/action-center/summary";
import { resolveNexusActionDraftType } from "@/lib/action-center/voice";
import { prepareIntelligenceActionDraft } from "@/lib/cross-system-intelligence/action-integration";
import type { NexusVoiceActionResult, NexusVoiceActionCenterToolName } from "@/lib/admin/nexus-voice/types";

export async function runNexusVoiceActionCenterTool(
  tool: NexusVoiceActionCenterToolName,
  admin: SupabaseClient,
  options: { transcript?: string; ownerId: string },
): Promise<NexusVoiceActionResult> {
  switch (tool) {
    case "prepareNexusActionDraft": {
      const transcript = options.transcript?.trim() ?? "";
      const actionType = resolveNexusActionDraftType(transcript);
      if (!actionType) {
        return {
          tool,
          data: {
            error: "unsupported_action_type",
          },
        };
      }

      const result = await createNexusActionCard(admin, {
        ownerId: options.ownerId,
        actionType,
        transcript,
      });

      if (!result.ok) {
        return {
          tool,
          data: { error: result.error },
        };
      }

      return {
        tool,
        data: { action: result.action },
      };
    }
    case "prepareIntelligenceActionDraft": {
      const result = await prepareIntelligenceActionDraft(admin, {
        ownerId: options.ownerId,
      });

      if (!result.ok) {
        return {
          tool,
          data: { error: result.error },
        };
      }

      return {
        tool,
        data: { action: result.action },
      };
    }
    case "getNexusActionQueue": {
      const queue = await getNexusActionQueue(admin, {
        access: "owner",
        status: "all",
        category: "all",
        limit: 20,
      });

      return {
        tool,
        data: {
          actions: filterActionsForVoiceQueue(queue.actions),
          counts: queue.counts,
        },
      };
    }
    default:
      throw new Error(`Unknown action center tool: ${tool}`);
  }
}
