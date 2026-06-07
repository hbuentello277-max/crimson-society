import type { NexusMemoryEntryType } from "@/lib/nexus/constants";

export type MemoryEntryDbRow = {
  id: string;
  entry_type: NexusMemoryEntryType;
  title: string;
  summary: string;
  source: string;
  importance_score: number;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type MemoryEntrySummaryRow = MemoryEntryDbRow;

export type MemoryDraft = {
  entry_type: NexusMemoryEntryType;
  title: string;
  summary: string;
  source: string;
  importance_score: number;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_by?: string | null;
};

export type NexusMemorySummary = {
  collected_at: string;
  counts: Record<NexusMemoryEntryType | "all", number>;
  entries: MemoryEntrySummaryRow[];
};

export type CreateOwnerNoteInput = {
  title: string;
  summary: string;
  importance_score?: number;
  occurred_at?: string;
};

export type UpdateOwnerNoteInput = {
  title?: string;
  summary?: string;
  importance_score?: number;
  occurred_at?: string;
};

export type MemoryGenerationResult = {
  ok: boolean;
  evaluated_at: string;
  drafts_considered: number;
  entries_created: number;
  entries_skipped: number;
  error?: string;
};
