import { createNexusServiceClient } from "@/lib/nexus/client";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";

export type CommandExpiryResult = {
  ok: boolean;
  evaluated_at: string;
  expired_count: number;
  error?: string;
};

export async function expireNexusCommands(): Promise<CommandExpiryResult> {
  const admin = createNexusServiceClient();
  const now = new Date().toISOString();

  try {
    const { data: rows, error: readError } = await admin
      .from("nexus_commands")
      .select("id, title, status, expires_at")
      .in("status", ["suggested", "pending_approval", "approved"])
      .not("expires_at", "is", null)
      .lte("expires_at", now)
      .limit(100);

    if (readError) {
      throw new Error(readError.message);
    }

    let expiredCount = 0;

    for (const row of rows ?? []) {
      const { error: updateError } = await admin
        .from("nexus_commands")
        .update({
          status: "expired",
          updated_at: now,
        })
        .eq("id", row.id as string);

      if (updateError) {
        throw new Error(updateError.message);
      }

      expiredCount += 1;

      await emitNexusEvent({
        source: "system",
        category: "infra",
        eventType: "command.expired",
        severity: "info",
        title: "Command expired",
        description: row.title as string,
        payload: {
          command_id: row.id,
          previous_status: row.status,
        },
      });

      await logNexusActivity({
        actorType: "collector",
        action: "nexus.command.expired",
        targetType: "nexus_command",
        targetId: row.id as string,
        details: { previous_status: row.status },
      });
    }

    await logNexusActivity({
      actorType: "collector",
      action: "nexus.commands.expiry.completed",
      targetType: "nexus",
      details: { expired_count: expiredCount },
    });

    return {
      ok: true,
      evaluated_at: now,
      expired_count: expiredCount,
    };
  } catch (error) {
    return {
      ok: false,
      evaluated_at: now,
      expired_count: 0,
      error: error instanceof Error ? error.message : "Command expiry failed",
    };
  }
}
