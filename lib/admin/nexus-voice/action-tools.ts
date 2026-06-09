import type { SupabaseClient } from "@supabase/supabase-js";
import { createRunbook } from "@/lib/runbooks/manager";
import {
  parseBriefingType,
  parseQuotedValue,
  parseSeverity,
  parseStepsFromTranscript,
  parseTitleFromTranscript,
} from "@/lib/admin/nexus-voice/routing";
import { createFounderMemoryEntry } from "@/lib/memory/manager";
import { isMemoryCategory, memoryCategoryLabel, type MemoryCategory } from "@/lib/memory/categories";
import { parseFounderMemoryDraft } from "@/lib/memory/voice-parse";
import { safeCount, safeSelect } from "@/lib/admin/nexus-voice/safe-query";
import type {
  NexusVoiceActionResult,
  NexusVoiceActionReadToolName,
  NexusVoiceConfirmToolName,
} from "@/lib/admin/nexus-voice/types";

export type NexusVoiceActionDraft = {
  tool: NexusVoiceConfirmToolName;
  label: string;
  summary: string;
  details: Record<string, unknown>;
  draft: Record<string, unknown>;
};

function formatCentsUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function getOrdersNeedingPickup(
  admin: SupabaseClient,
): Promise<NexusVoiceActionResult> {
  const result = await safeSelect<{
    id: string;
    total_cents: number;
    pickup_status: string | null;
    created_at: string | null;
  }>(admin, "shop_orders", "id, total_cents, pickup_status, created_at", (query) =>
    query
      .eq("delivery_method", "local_pickup")
      .eq("status", "paid")
      .in("pickup_status", ["pending", "ready"])
      .order("created_at", { ascending: false })
      .limit(8),
  );

  return {
    tool: "getOrdersNeedingPickup",
    data: {
      count: result.data.length,
      orders: result.data.map((row) => ({
        id: row.id,
        total: formatCentsUsd(Number(row.total_cents ?? 0)),
        pickupStatus: row.pickup_status,
        createdAt: row.created_at,
      })),
    },
    partial: result.partial,
    warnings: result.partial ? ["Pickup order data may be incomplete."] : undefined,
  };
}

export async function getFailedMediaJobs(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const [failed, queued] = await Promise.all([
    safeSelect<{
      id: string;
      post_id: string | null;
      status: string | null;
      error_message: string | null;
      updated_at: string | null;
    }>(admin, "media_processing_jobs", "id, post_id, status, error_message, updated_at", (query) =>
      query.eq("status", "failed").order("updated_at", { ascending: false }).limit(8),
    ),
    safeCount(admin, "media_processing_jobs", (query) => query.eq("status", "queued")),
  ]);

  return {
    tool: "getFailedMediaJobs",
    data: {
      failedCount: failed.data.length,
      queuedCount: queued.data,
      jobs: failed.data,
    },
    partial: failed.partial || queued.partial,
    warnings:
      failed.partial || queued.partial
        ? ["Media processing tables may be unavailable in this environment."]
        : undefined,
  };
}

export async function summarizePendingReports(
  admin: SupabaseClient,
): Promise<NexusVoiceActionResult> {
  const reports = await safeSelect<{
    id: string;
    reason: string | null;
    status: string | null;
    created_at: string | null;
  }>(admin, "user_reports", "id, reason, status, created_at", (query) =>
    query.eq("status", "pending").order("created_at", { ascending: false }).limit(8),
  );

  const reasons = reports.data.reduce<Record<string, number>>((acc, row) => {
    const key = (row.reason || "unspecified").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    tool: "summarizePendingReports",
    data: {
      count: reports.data.length,
      topReasons: Object.entries(reasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count })),
      recent: reports.data,
    },
    partial: reports.partial,
    warnings: reports.partial ? ["Report moderation data may be incomplete."] : undefined,
  };
}

export function buildActionDraft(
  tool: NexusVoiceConfirmToolName,
  transcript: string,
): NexusVoiceActionDraft {
  switch (tool) {
    case "createSystemAlertDraft": {
      const severity = parseSeverity(transcript);
      const title = parseTitleFromTranscript(transcript, "NEXUS voice alert");
      const message =
        parseQuotedValue(transcript, "message") ||
        `Prepared from NEXUS voice: ${transcript.slice(0, 240)}`;
      const draft = { title, message, severity, category: "operations" };
      return {
        tool,
        label: "Create system alert",
        summary: `Alert "${title}" (${severity})`,
        details: draft,
        draft,
      };
    }
    case "createAdminBriefingDraft": {
      const type = parseBriefingType(transcript);
      const title = `${type === "weekly" ? "Weekly" : "Daily"} admin briefing draft`;
      const draft = {
        type,
        title,
        summary: `Prepared ${type} briefing draft from NEXUS voice command.`,
      };
      return {
        tool,
        label: `Create ${type} briefing draft`,
        summary: title,
        details: draft,
        draft,
      };
    }
    case "createRunbookDraft": {
      const title = parseTitleFromTranscript(transcript, "NEXUS voice runbook");
      const steps = parseStepsFromTranscript(transcript);
      const draft = {
        title,
        category: "operations",
        severity: parseSeverity(transcript),
        description: `Draft runbook prepared from NEXUS voice.`,
        resolution_steps: steps.map((step, index) => ({
          id: `step-${index + 1}`,
          title: step,
        })),
      };
      return {
        tool,
        label: "Create runbook draft",
        summary: `Runbook "${title}" with ${steps.length} steps`,
        details: { title, steps },
        draft,
      };
    }
    case "createNexusObservationDraft": {
      const severity = parseSeverity(transcript);
      const title = parseTitleFromTranscript(transcript, "NEXUS voice observation");
      const summary =
        parseQuotedValue(transcript, "summary") ||
        `Observation prepared from NEXUS voice: ${transcript.slice(0, 240)}`;
      const draft = {
        title,
        summary,
        severity,
        observation_type: "summary",
        category: "operations",
      };
      return {
        tool,
        label: "Create observation draft",
        summary: `Observation "${title}" (${severity})`,
        details: draft,
        draft,
      };
    }
    case "createFounderMemoryDraft": {
      const parsed = parseFounderMemoryDraft(transcript);
      const draft = {
        ...parsed,
        capture_source: "voice",
      };
      return {
        tool,
        label: "Save founder memory",
        summary: `${memoryCategoryLabel(parsed.memory_category)} — ${parsed.title}`,
        details: {
          memory_category: parsed.memory_category,
          title: parsed.title,
          summary: parsed.summary,
          importance: parsed.importance_score,
          source: "voice",
        },
        draft,
      };
    }
    default:
      throw new Error("Unsupported draft action.");
  }
}

export async function executeConfirmedAction(
  admin: SupabaseClient,
  userId: string,
  tool: NexusVoiceConfirmToolName,
  draft: Record<string, unknown>,
): Promise<NexusVoiceActionResult> {
  switch (tool) {
    case "createSystemAlertDraft": {
      const title = String(draft.title ?? "NEXUS voice alert").slice(0, 120);
      const message = String(draft.message ?? "").slice(0, 2000);
      const severity = String(draft.severity ?? "info");
      const category = String(draft.category ?? "operations");

      const { data, error } = await admin
        .from("nexus_alerts")
        .insert({
          category,
          severity,
          title,
          message,
          status: "active",
          metadata: {
            source: "nexus_voice",
            created_by: userId,
            draft_confirmed_at: new Date().toISOString(),
          },
        })
        .select("id, title, severity, status")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        tool,
        data: { alertId: data.id, title: data.title, severity: data.severity, status: data.status },
      };
    }
    case "createAdminBriefingDraft": {
      const type = draft.type === "weekly" ? "weekly" : "daily";
      const title = String(draft.title ?? `${type} admin briefing draft`);
      const summary = String(draft.summary ?? `Prepared ${type} briefing draft.`);

      const { data, error } = await admin
        .from("nexus_memory_entries")
        .insert({
          entry_type: "briefing",
          title,
          summary,
          source: "nexus_voice",
          importance_score: 5,
          occurred_at: new Date().toISOString(),
          metadata: {
            briefing_type: type,
            draft: true,
            created_by: userId,
            dedupe_key: `voice-briefing:${type}:${new Date().toISOString().slice(0, 10)}`,
          },
          created_by: userId,
        })
        .select("id, title, summary")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        tool,
        data: { entryId: data.id, title: data.title, summary: data.summary, type },
      };
    }
    case "createRunbookDraft": {
      const title = String(draft.title ?? "NEXUS voice runbook");
      const result = await createRunbook(
        admin,
        {
          slug: title,
          title,
          category: "operations",
          severity: (draft.severity as "info" | "warning" | "critical") ?? "info",
          description: String(draft.description ?? "Draft runbook prepared from NEXUS voice."),
          resolution_steps: Array.isArray(draft.resolution_steps)
            ? (draft.resolution_steps as Array<{ id: string; title: string }>)
            : [],
        },
        userId,
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      return {
        tool,
        data: { runbookId: result.runbook.id, slug: result.runbook.slug, title: result.runbook.title },
      };
    }
    case "createFounderMemoryDraft": {
      const title = String(draft.title ?? "Founder memory").slice(0, 120);
      const summary = String(draft.summary ?? "").slice(0, 2000);
      const rawCategory = String(draft.memory_category ?? "business_note");
      const memoryCategory: MemoryCategory = isMemoryCategory(rawCategory)
        ? rawCategory
        : "business_note";
      const entryType = draft.entry_type === "milestone" ? "milestone" : "owner_note";

      const result = await createFounderMemoryEntry(admin, userId, {
        title,
        summary,
        memory_category: memoryCategory,
        importance_score: Number(draft.importance_score ?? 6),
        source: "voice",
        entry_type: entryType,
        metadata: {
          capture_source: "voice",
          voice_confirmed_at: new Date().toISOString(),
        },
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      return {
        tool,
        data: {
          entryId: result.entry.id,
          title: result.entry.title,
          memory_category: memoryCategory,
          importance: result.entry.importance_score,
        },
      };
    }
    case "createNexusObservationDraft": {
      const title = String(draft.title ?? "NEXUS voice observation").slice(0, 120);
      const summary = String(draft.summary ?? "").slice(0, 2000);
      const severity = String(draft.severity ?? "info");

      const { data, error } = await admin
        .from("nexus_observations")
        .insert({
          observation_type: "summary",
          category: "operations",
          severity,
          confidence: 0.7,
          title,
          summary,
          evidence: { source: "nexus_voice" },
          source: "manual",
          status: "active",
          occurred_at: new Date().toISOString(),
          metadata: {
            source: "nexus_voice",
            draft: true,
            created_by: userId,
            dedupe_key: `voice-observation:${Date.now()}`,
          },
        })
        .select("id, title, severity, status")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        tool,
        data: {
          observationId: data.id,
          title: data.title,
          severity: data.severity,
          status: data.status,
        },
      };
    }
    default:
      throw new Error("Unsupported confirmed action.");
  }
}

const ACTION_READ_RUNNERS: Record<
  NexusVoiceActionReadToolName,
  (admin: SupabaseClient) => Promise<NexusVoiceActionResult>
> = {
  getOrdersNeedingPickup,
  getFailedMediaJobs,
  summarizePendingReports,
};

export async function runNexusVoiceActionReadTool(
  tool: NexusVoiceActionReadToolName,
  admin: SupabaseClient,
): Promise<NexusVoiceActionResult> {
  return ACTION_READ_RUNNERS[tool](admin);
}
