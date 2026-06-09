import type { SupabaseClient } from "@supabase/supabase-js";
import { NEXUS_ACTION_CATEGORIES } from "@/lib/action-center/constants";
import { mapActionCardRow } from "@/lib/action-center/manager";
import {
  canReadActionCategory,
  type NexusActionAccess,
} from "@/lib/action-center/permissions";
import type {
  NexusActionCard,
  NexusActionCategory,
  NexusActionQueueResponse,
  NexusActionStatus,
} from "@/lib/action-center/types";

export async function getNexusActionQueue(
  supabase: SupabaseClient,
  options: {
    access: NexusActionAccess;
    status?: NexusActionStatus | "all";
    category?: NexusActionCategory | "all";
    limit?: number;
  },
): Promise<NexusActionQueueResponse> {
  const limit = options.limit ?? 100;
  let query = supabase
    .from("nexus_action_cards")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.category && options.category !== "all") {
    query = query.eq("action_category", options.category);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const actions = ((data ?? []) as Record<string, unknown>[])
    .map(mapActionCardRow)
    .filter((action) => canReadActionCategory(options.access, action.action_category));

  const counts = {
    all: actions.length,
    draft: actions.filter((action) => action.status === "draft").length,
    pending_approval: actions.filter((action) => action.status === "pending_approval").length,
    approved: actions.filter((action) => action.status === "approved").length,
    executed: actions.filter((action) => action.status === "executed").length,
    rejected: actions.filter((action) => action.status === "rejected").length,
  } satisfies Record<NexusActionStatus | "all", number>;

  const counts_by_category: Partial<Record<NexusActionCategory, number>> = {};
  for (const category of NEXUS_ACTION_CATEGORIES) {
    counts_by_category[category] = actions.filter(
      (action) => action.action_category === category,
    ).length;
  }

  return {
    collected_at: new Date().toISOString(),
    counts,
    counts_by_category,
    actions,
    access: options.access,
  };
}

export function filterActionsForVoiceQueue(actions: NexusActionCard[]): NexusActionCard[] {
  return actions.filter((action) =>
    ["draft", "pending_approval", "approved"].includes(action.status),
  );
}
