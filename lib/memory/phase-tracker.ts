import type { SupabaseClient } from "@supabase/supabase-js";
import { mapMemoryRow } from "@/lib/memory/manager";
import { createNexusServiceClient } from "@/lib/nexus/client";
import type { MemoryEntryDbRow } from "@/lib/memory/types";

export type NexusPhaseStatus = "completed" | "in_progress" | "planned";

export type NexusPhaseDefinition = {
  phase_number: number;
  phase_name: string;
  status: NexusPhaseStatus;
  summary: string;
  completed_at?: string | null;
};

export const NEXUS_PHASE_DEFINITIONS: NexusPhaseDefinition[] = [
  { phase_number: 1, phase_name: "Foundation", status: "completed", summary: "Core NEXUS infrastructure and owner console." },
  { phase_number: 2, phase_name: "Voice Assistant", status: "completed", summary: "Read-only voice queries for platform metrics." },
  { phase_number: 3, phase_name: "Safe Actions", status: "completed", summary: "Confirmed draft actions for alerts, briefings, and runbooks." },
  { phase_number: 4, phase_name: "Platform Monitoring", status: "completed", summary: "Checkout, signup, media, and push health monitoring." },
  { phase_number: 5, phase_name: "Platform Status + Cron Activation", status: "completed", summary: "Platform Status score and scheduled platform jobs." },
  { phase_number: 6, phase_name: "Unified Voice", status: "completed", summary: "Single NEXUS voice surface across admin routes." },
  { phase_number: 7, phase_name: "Founder Copilot", status: "completed", summary: "Founder briefings, recommendations, and timeline." },
  { phase_number: 8, phase_name: "Proactive Intelligence", status: "completed", summary: "Morning briefing, proactive alerts, and launch readiness." },
  {
    phase_number: 9,
    phase_name: "Persistent Memory & Context Awareness",
    status: "in_progress",
    summary: "Persistent founder memory, retrieval, and context-aware copilot responses.",
  },
];

function phaseDedupeKey(phaseNumber: number): string {
  return `nexus:phase:${phaseNumber}`;
}

export async function ensureNexusPhaseMemoryEntries(
  admin: SupabaseClient = createNexusServiceClient(),
): Promise<void> {
  const { data: existing } = await admin
    .from("nexus_memory_entries")
    .select("metadata")
    .eq("entry_type", "milestone")
    .limit(200);

  const existingKeys = new Set(
    (existing ?? [])
      .map((row) => (row.metadata as Record<string, unknown> | null)?.dedupe_key)
      .filter((value): value is string => typeof value === "string"),
  );

  const drafts = NEXUS_PHASE_DEFINITIONS.filter(
    (phase) => !existingKeys.has(phaseDedupeKey(phase.phase_number)),
  ).map((phase) => ({
    entry_type: "milestone" as const,
    title: `NEXUS Phase ${phase.phase_number} — ${phase.phase_name}`,
    summary: phase.summary,
    source: "nexus_phase_tracker",
    importance_score: phase.status === "in_progress" ? 9 : 7,
    occurred_at:
      phase.completed_at ??
      (phase.status === "in_progress" ? new Date().toISOString() : new Date("2026-01-01T00:00:00.000Z").toISOString()),
    metadata: {
      dedupe_key: phaseDedupeKey(phase.phase_number),
      memory_category: "milestone",
      phase_number: phase.phase_number,
      phase_name: phase.phase_name,
      phase_status: phase.status,
      nexus_phase: true,
    },
  }));

  if (drafts.length === 0) return;

  await admin.from("nexus_memory_entries").insert(drafts);
}

export type NexusPhaseSummary = {
  generatedAt: string;
  currentPhase: NexusPhaseDefinition;
  completedPhases: NexusPhaseDefinition[];
  inProgressPhases: NexusPhaseDefinition[];
  memoryEntries: MemoryEntryDbRow[];
};

export async function getNexusPhaseSummary(admin: SupabaseClient): Promise<NexusPhaseSummary> {
  await ensureNexusPhaseMemoryEntries();

  const { data } = await admin
    .from("nexus_memory_entries")
    .select("*")
    .eq("entry_type", "milestone")
    .contains("metadata", { nexus_phase: true })
    .order("occurred_at", { ascending: true });

  const memoryEntries = (data ?? []).map((row) => mapMemoryRow(row as Record<string, unknown>));

  const phasesFromMemory: NexusPhaseDefinition[] = memoryEntries
    .map((entry) => {
      const metadata = entry.metadata;
      const phaseNumber = Number(metadata.phase_number);
      if (!Number.isFinite(phaseNumber)) return null;
      const phase: NexusPhaseDefinition = {
        phase_number: phaseNumber,
        phase_name: String(metadata.phase_name ?? entry.title),
        status: (metadata.phase_status as NexusPhaseStatus) ?? "planned",
        summary: entry.summary,
        completed_at: entry.occurred_at,
      };
      return phase;
    })
    .filter((phase): phase is NexusPhaseDefinition => phase !== null)
    .sort((a, b) => a.phase_number - b.phase_number);

  const phases = phasesFromMemory.length > 0 ? phasesFromMemory : NEXUS_PHASE_DEFINITIONS;
  const inProgressPhases = phases.filter((phase) => phase.status === "in_progress");
  const completedPhases = phases.filter((phase) => phase.status === "completed");
  const currentPhase = inProgressPhases[0] ?? phases[phases.length - 1];

  return {
    generatedAt: new Date().toISOString(),
    currentPhase,
    completedPhases,
    inProgressPhases,
    memoryEntries,
  };
}
