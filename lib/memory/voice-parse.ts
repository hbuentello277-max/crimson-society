import {
  defaultImportanceForCategory,
  isMemoryCategory,
  type MemoryCategory,
} from "@/lib/memory/categories";
import { parseQuotedValue, parseTitleFromTranscript } from "@/lib/admin/nexus-voice/routing";

export type FounderMemoryDraftInput = {
  memory_category: MemoryCategory;
  title: string;
  summary: string;
  importance_score: number;
  entry_type: "owner_note" | "milestone";
  source: "voice";
};

function extractRememberClause(transcript: string): string {
  const patterns = [
    /\bremember that\s+(.+)$/i,
    /\bsave this decision[:\s]+(.+)$/i,
    /\badd this to founder memory[:\s]+(.+)$/i,
    /\bmark this as (?:a )?blocker[:\s]+(.+)$/i,
    /\bmark this as completed[:\s]+(.+)$/i,
    /\bnexus[, ]+remember that\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return transcript
    .replace(/\b(nexus[, ]*)?(remember that|save this decision|add this to founder memory|mark this as (?:a )?blocker|mark this as completed)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFounderMemoryDraft(transcript: string): FounderMemoryDraftInput {
  const normalized = transcript.trim();
  let memory_category: MemoryCategory = "business_note";
  let entry_type: "owner_note" | "milestone" = "owner_note";

  if (/\bmark this as completed\b/i.test(normalized)) {
    memory_category = "milestone";
    entry_type = "milestone";
  } else if (/\bmark this as (?:a )?blocker\b/i.test(normalized)) {
    memory_category = "blocker";
  } else if (/\bsave this decision\b/i.test(normalized)) {
    memory_category = "decision";
  } else if (/\badd this to founder memory\b/i.test(normalized)) {
    memory_category = "founder_preference";
  } else if (/\bremember that\b/i.test(normalized)) {
    if (/\b(blackcard|monetization|revenue|pricing)\b/i.test(normalized)) {
      memory_category = "business_note";
    } else if (/\b(ui|design|terminology|platform status|platform health)\b/i.test(normalized)) {
      memory_category = "technical_note";
    } else if (/\b(marketing|launch|app store)\b/i.test(normalized)) {
      memory_category = "marketing_note";
    } else if (/\b(deploy|vercel|cron|production)\b/i.test(normalized)) {
      memory_category = "technical_note";
    } else {
      memory_category = "decision";
    }
  }

  const quotedSummary = parseQuotedValue(normalized, "summary");
  const clause = extractRememberClause(normalized);
  const summary = (quotedSummary || clause || normalized).slice(0, 2000);
  const title = parseTitleFromTranscript(summary, `Founder memory — ${memory_category.replace(/_/g, " ")}`).slice(0, 120);

  return {
    memory_category,
    title,
    summary,
    importance_score: defaultImportanceForCategory(memory_category),
    entry_type,
    source: "voice",
  };
}

export function parseFounderMemoryCategoryOverride(value: unknown): MemoryCategory | null {
  if (typeof value !== "string" || !isMemoryCategory(value)) return null;
  return value;
}
