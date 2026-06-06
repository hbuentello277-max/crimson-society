import { createNexusServiceClient } from "@/lib/nexus/client";
import type { NexusActorType } from "@/lib/nexus/constants";

export type NexusActivityLogInput = {
  actorId?: string | null;
  actorType: NexusActorType;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type NexusActivityLogResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function logNexusActivity(
  input: NexusActivityLogInput,
): Promise<NexusActivityLogResult> {
  const admin = createNexusServiceClient();

  const { data, error } = await admin
    .from("nexus_activity_log")
    .insert({
      actor_id: input.actorId ?? null,
      actor_type: input.actorType,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      details: input.details ?? {},
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[nexus-activity-log] insert failed", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data.id as string };
}
