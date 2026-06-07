import type { SupabaseClient } from "@supabase/supabase-js";
import { getMissionHealthSnapshot } from "@/lib/mission-health/summary";
import { getNexusHealthSnapshot } from "@/lib/monitoring/health-summary";
import { createNexusServiceClient } from "@/lib/nexus/client";
import { emitNexusEvent } from "@/lib/events/emit";
import { logNexusActivity } from "@/lib/nexus/activity-log";
import { commandInsertRow } from "@/lib/commands/mapper";
import {
  buildAlertCommandDrafts,
  buildIncidentCommandDrafts,
  buildInfrastructureCommandDrafts,
  buildObservationCommandDrafts,
  buildWarRoomCommandDrafts,
  buildWeeklySummaryCommand,
  buildWorkflowCommandDrafts,
} from "@/lib/commands/rules";
import type { CommandSuggestionDraft } from "@/lib/commands/types";

export type CommandGenerationResult = {
  ok: boolean;
  evaluated_at: string;
  drafts_considered: number;
  commands_created: number;
  commands_skipped: number;
  error?: string;
};

async function loadRunbooksBySlug(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("nexus_runbooks")
    .select("id, slug")
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((row) => [row.slug as string, row.id as string]));
}

async function existingDedupeKeys(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("nexus_commands")
    .select("metadata")
    .in("status", ["suggested", "pending_approval", "approved"]);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    (data ?? [])
      .map((row) => {
        const metadata = (row.metadata as Record<string, unknown>) ?? {};
        return typeof metadata.dedupe_key === "string" ? metadata.dedupe_key : null;
      })
      .filter((value): value is string => Boolean(value)),
  );
}

async function existingActiveRunbookCommandIds(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("nexus_commands")
    .select("runbook_id")
    .eq("command_type", "follow_runbook")
    .in("status", ["suggested", "pending_approval", "approved"])
    .not("runbook_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((row) => row.runbook_id as string));
}

async function expireCommandsForInactiveObservations(
  admin: SupabaseClient,
  activeObservationIds: Set<string>,
) {
  const { data, error } = await admin
    .from("nexus_commands")
    .select("id, observation_id, metadata")
    .eq("origin", "observation")
    .in("status", ["suggested", "pending_approval", "approved"])
    .not("observation_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const staleRows = (data ?? []).filter(
    (row) => !activeObservationIds.has(row.observation_id as string),
  );

  if (staleRows.length === 0) {
    return 0;
  }

  const expiredAt = new Date().toISOString();
  let expired = 0;

  for (const row of staleRows) {
    const metadata = (row.metadata as Record<string, unknown>) ?? {};
    const { error: updateError } = await admin
      .from("nexus_commands")
      .update({
        status: "expired",
        updated_at: expiredAt,
        metadata: {
          ...metadata,
          previous_status_expired_by: "command_generation",
          observation_id: row.observation_id,
          expired_at: expiredAt,
          expiry_reason: "related_observation_inactive",
        },
      })
      .eq("id", row.id as string);

    if (updateError) {
      throw new Error(updateError.message);
    }

    expired += 1;
  }

  return expired;
}

async function expireDuplicateObservationRunbookCommands(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("nexus_commands")
    .select("id, runbook_id, observation_id, created_at, metadata")
    .eq("command_type", "follow_runbook")
    .in("status", ["suggested", "pending_approval", "approved"])
    .not("runbook_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const seen = new Set<string>();
  const duplicates = (data ?? []).filter((row) => {
    const key = row.runbook_id as string;
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
    return false;
  });

  if (duplicates.length === 0) {
    return 0;
  }

  const expiredAt = new Date().toISOString();
  let expired = 0;

  for (const row of duplicates) {
    const metadata = (row.metadata as Record<string, unknown>) ?? {};
    const { error: updateError } = await admin
      .from("nexus_commands")
      .update({
        status: "expired",
        updated_at: expiredAt,
        metadata: {
          ...metadata,
          previous_status_expired_by: "command_generation",
          observation_id: row.observation_id,
          runbook_id: row.runbook_id,
          expired_at: expiredAt,
          expiry_reason: "duplicate_observation_runbook",
        },
      })
      .eq("id", row.id as string);

    if (updateError) {
      throw new Error(updateError.message);
    }

    expired += 1;
  }

  return expired;
}

async function expirePositiveObservationCommands(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("nexus_commands")
    .select("id, observation_id, metadata")
    .eq("origin", "observation")
    .in("status", ["suggested", "pending_approval", "approved"])
    .not("observation_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return 0;
  }

  const observationIds = [...new Set(data.map((row) => row.observation_id as string))];
  const { data: observations, error: observationsError } = await admin
    .from("nexus_observations")
    .select("id, severity")
    .in("id", observationIds)
    .eq("severity", "info");

  if (observationsError) {
    throw new Error(observationsError.message);
  }

  const positiveObservationIds = new Set((observations ?? []).map((row) => row.id as string));
  const positiveRows = data.filter((row) =>
    positiveObservationIds.has(row.observation_id as string),
  );

  if (positiveRows.length === 0) {
    return 0;
  }

  const expiredAt = new Date().toISOString();
  let expired = 0;

  for (const row of positiveRows) {
    const metadata = (row.metadata as Record<string, unknown>) ?? {};
    const { error: updateError } = await admin
      .from("nexus_commands")
      .update({
        status: "expired",
        updated_at: expiredAt,
        metadata: {
          ...metadata,
          previous_status_expired_by: "command_generation",
          observation_id: row.observation_id,
          expired_at: expiredAt,
          expiry_reason: "positive_observation",
        },
      })
      .eq("id", row.id as string);

    if (updateError) {
      throw new Error(updateError.message);
    }

    expired += 1;
  }

  return expired;
}

async function cleanupStaleObservationCommands(
  admin: SupabaseClient,
  activeObservationIds: Set<string>,
) {
  const inactiveExpired = await expireCommandsForInactiveObservations(admin, activeObservationIds);
  const positiveExpired = await expirePositiveObservationCommands(admin);
  const duplicateExpired = await expireDuplicateObservationRunbookCommands(admin);

  return {
    inactiveExpired,
    duplicateExpired,
    positiveExpired,
    total: inactiveExpired + duplicateExpired + positiveExpired,
  };
}

async function cleanupRecoveredInfrastructureCommands(
  admin: SupabaseClient,
  integrations: Array<{ slug: string; status: string }>,
) {
  const recovered = new Set(
    integrations
      .filter((integration) => integration.status.toLowerCase() === "healthy")
      .map((integration) => integration.slug),
  );

  if (recovered.size === 0) {
    return 0;
  }

  const staleDedupeKeys = [
    recovered.has("github") ? "infra:github-token:github" : null,
    recovered.has("vercel") ? "infra:vercel-token:vercel" : null,
    recovered.has("supabase") ? "infra:supabase-health:supabase" : null,
    recovered.has("supabase") ? "runbook:infrastructure-recovery:supabase" : null,
  ].filter((value): value is string => Boolean(value));

  if (staleDedupeKeys.length === 0) {
    return 0;
  }

  const { data, error } = await admin
    .from("nexus_commands")
    .select("id, metadata")
    .eq("origin", "system")
    .in("status", ["suggested", "pending_approval", "approved"]);

  if (error) {
    throw new Error(error.message);
  }

  const staleRows = (data ?? []).filter((row) => {
    const metadata = (row.metadata as Record<string, unknown>) ?? {};
    return typeof metadata.dedupe_key === "string" && staleDedupeKeys.includes(metadata.dedupe_key);
  });

  if (staleRows.length === 0) {
    return 0;
  }

  const expiredAt = new Date().toISOString();
  let expired = 0;

  for (const row of staleRows) {
    const metadata = (row.metadata as Record<string, unknown>) ?? {};
    const { error: updateError } = await admin
      .from("nexus_commands")
      .update({
        status: "expired",
        updated_at: expiredAt,
        metadata: {
          ...metadata,
          previous_status_expired_by: "command_generation",
          expired_at: expiredAt,
          expiry_reason: "integration_recovered",
        },
      })
      .eq("id", row.id as string);

    if (updateError) {
      throw new Error(updateError.message);
    }

    expired += 1;
  }

  return expired;
}

function initialStatus(draft: CommandSuggestionDraft) {
  return draft.risk_level === "high" ? "pending_approval" : "suggested";
}

export async function generateNexusCommandSuggestions(
  supabase?: SupabaseClient,
): Promise<CommandGenerationResult> {
  const client = supabase ?? createNexusServiceClient();
  const admin = createNexusServiceClient();
  const evaluatedAt = new Date().toISOString();

  try {
    const [
      health,
      mission,
      runbooksBySlug,
      alertsResult,
      incidentsResult,
      observationsResult,
      warRoomsResult,
      dedupeKeys,
      activeRunbookCommandIds,
    ] = await Promise.all([
      getNexusHealthSnapshot(client),
      getMissionHealthSnapshot(client),
      loadRunbooksBySlug(client),
      client
        .from("nexus_alerts")
        .select("id, title, severity, category, rule_id, status")
        .in("status", ["active", "acknowledged"])
        .order("updated_at", { ascending: false })
        .limit(50),
      client
        .from("nexus_incidents")
        .select("id, title, severity, status, metadata")
        .order("updated_at", { ascending: false })
        .limit(50),
      client
        .from("nexus_observations")
        .select("id, title, summary, category, severity, status, rule_id, metadata")
        .eq("status", "active")
        .order("occurred_at", { ascending: false })
        .limit(50),
      client
        .from("nexus_war_rooms")
        .select("id, title, incident_id, status")
        .in("status", ["open", "active"])
        .limit(20),
      existingDedupeKeys(admin),
      existingActiveRunbookCommandIds(admin),
    ]);

    if (alertsResult.error) throw new Error(alertsResult.error.message);
    if (incidentsResult.error) throw new Error(incidentsResult.error.message);
    if (observationsResult.error) throw new Error(observationsResult.error.message);
    if (warRoomsResult.error) throw new Error(warRoomsResult.error.message);

    const warRoomByIncident = new Map(
      (warRoomsResult.data ?? []).map((row) => [row.incident_id as string, row.id as string]),
    );
    const activeObservationIds = new Set(
      (observationsResult.data ?? []).map((row) => row.id as string),
    );
    const staleObservationCommandCleanup = await cleanupStaleObservationCommands(
      admin,
      activeObservationIds,
    );
    const recoveredInfrastructureCommandsExpired = await cleanupRecoveredInfrastructureCommands(
      admin,
      health.integrations,
    );

    const incidents = (incidentsResult.data ?? []).map((row) => {
      const metadata = (row.metadata as Record<string, unknown>) ?? {};
      return {
        id: row.id as string,
        title: row.title as string,
        severity: row.severity as string,
        status: row.status as string,
        impact_score: typeof metadata.impact_score === "number" ? metadata.impact_score : 0,
      };
    });

    const drafts: CommandSuggestionDraft[] = [
      ...buildInfrastructureCommandDrafts({
        integrations: health.integrations,
        runbooksBySlug,
      }),
      ...buildWorkflowCommandDrafts({
        missionStatus: mission.status,
        workflows: mission.workflows.map((wf) => ({
          slug: wf.slug,
          display_name: wf.display_name,
          workflow_status: wf.workflow_status,
        })),
        runbooksBySlug,
      }),
      ...buildAlertCommandDrafts({
        alerts: (alertsResult.data ?? []).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          severity: row.severity as string,
          category: row.category as string,
          rule_id: (row.rule_id as string | null) ?? null,
        })),
      }),
      ...buildIncidentCommandDrafts({
        incidents,
        warRoomByIncident,
        runbooksBySlug,
      }),
      ...buildObservationCommandDrafts({
        observations: (observationsResult.data ?? []).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          summary: row.summary as string,
          category: row.category as string,
          severity: row.severity as string,
          rule_id: (row.rule_id as string | null) ?? null,
          metadata: ((row.metadata as Record<string, unknown>) ?? {}),
        })),
        runbooksBySlug,
      }),
      ...buildWarRoomCommandDrafts({
        warRooms: (warRoomsResult.data ?? []).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          incident_id: row.incident_id as string,
        })),
        runbooksBySlug,
      }),
      buildWeeklySummaryCommand(),
    ];

    let created = 0;
    let skipped = 0;

    for (const draft of drafts) {
      if (dedupeKeys.has(draft.dedupe_key)) {
        skipped += 1;
        continue;
      }

      if (
        draft.command_type === "follow_runbook" &&
        draft.related_runbook_id &&
        activeRunbookCommandIds.has(draft.related_runbook_id)
      ) {
        skipped += 1;
        continue;
      }

      const status = initialStatus(draft);
      const insertRow = commandInsertRow({
        ...draft,
        status,
      });

      const { data: inserted, error: insertError } = await admin
        .from("nexus_commands")
        .insert(insertRow)
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          skipped += 1;
          continue;
        }
        throw new Error(insertError.message);
      }

      dedupeKeys.add(draft.dedupe_key);
      if (draft.command_type === "follow_runbook" && draft.related_runbook_id) {
        activeRunbookCommandIds.add(draft.related_runbook_id);
      }
      created += 1;

      await emitNexusEvent({
        source: "system",
        category: "infra",
        eventType: "command.suggested",
        severity: draft.risk_level === "high" ? "critical" : "warning",
        title: draft.title,
        description: draft.summary,
        payload: {
          command_id: inserted?.id,
          command_type: draft.command_type,
          dedupe_key: draft.dedupe_key,
          risk_level: draft.risk_level,
        },
      });
    }

    await logNexusActivity({
      actorType: "collector",
      action: "nexus.commands.generated",
      targetType: "nexus",
      details: {
        drafts_considered: drafts.length,
        commands_created: created,
        commands_skipped: skipped,
        stale_observation_commands_expired: staleObservationCommandCleanup.total,
        stale_observation_command_cleanup: staleObservationCommandCleanup,
        recovered_infrastructure_commands_expired: recoveredInfrastructureCommandsExpired,
      },
    });

    return {
      ok: true,
      evaluated_at: evaluatedAt,
      drafts_considered: drafts.length,
      commands_created: created,
      commands_skipped: skipped,
    };
  } catch (error) {
    return {
      ok: false,
      evaluated_at: evaluatedAt,
      drafts_considered: 0,
      commands_created: 0,
      commands_skipped: 0,
      error: error instanceof Error ? error.message : "Command generation failed",
    };
  }
}
