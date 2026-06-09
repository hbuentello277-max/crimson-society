import type { SupabaseClient } from "@supabase/supabase-js";
import { getFounderRecommendations } from "@/lib/founder-copilot/recommendations";
import { getNexusPhaseSummary } from "@/lib/memory/phase-tracker";
import { getNexusMemorySummary } from "@/lib/memory/summary";
import type { MemoryCategory } from "@/lib/memory/categories";
import type { MemoryEntryDbRow } from "@/lib/memory/types";
import { loadReportContext } from "@/lib/reports/context";

export type MemoryQueryIntent =
  | "phase_status"
  | "completed_this_week"
  | "launch_blockers"
  | "topic_search"
  | "deployment_issue"
  | "summarize_memory"
  | "last_major_fix";

export type MemoryRetrievalResult = {
  generatedAt: string;
  intent: MemoryQueryIntent;
  query: string;
  answer: string;
  highlights: string[];
  memoryEntries: MemoryEntryDbRow[];
  relatedSignals: string[];
};

function startOfUtcWeekIso(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday.toISOString();
}

function entryCategory(entry: MemoryEntryDbRow): MemoryCategory | null {
  const category = entry.metadata.memory_category;
  return typeof category === "string" ? (category as MemoryCategory) : null;
}

function entryMatchesTopic(entry: MemoryEntryDbRow, topic: string): boolean {
  const haystack = `${entry.title} ${entry.summary}`.toLowerCase();
  return topic
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => haystack.includes(token));
}

function openBlockerEntries(entries: MemoryEntryDbRow[]): MemoryEntryDbRow[] {
  return entries.filter((entry) => {
    const category = entryCategory(entry);
    if (category !== "blocker" && category !== "launch_status") return false;
    const status = entry.metadata.blocker_status ?? entry.metadata.status;
    return status !== "resolved" && status !== "completed";
  });
}

export function resolveMemoryQueryIntent(transcript: string): MemoryQueryIntent | null {
  const normalized = transcript.trim().toLowerCase();
  if (!normalized) return null;

  if (/\bwhat phase are we on\b/i.test(normalized)) return "phase_status";
  if (/\bwhat did we finish this week\b/i.test(normalized)) return "completed_this_week";
  if (/\bwhat is still blocking launch\b/i.test(normalized)) return "launch_blockers";
  if (/\bwhat was the last major issue we fixed\b/i.test(normalized)) return "last_major_fix";
  if (/\bwhat should i remember about\b/i.test(normalized)) return "deployment_issue";
  if (/\bsummarize founder memory\b/i.test(normalized)) return "summarize_memory";
  if (/\bwhat did we decide about\b/i.test(normalized)) return "topic_search";
  if (/\bwhy did production stop deploying\b/i.test(normalized)) return "deployment_issue";
  if (/\bwhat did we change about platform status\b/i.test(normalized)) return "topic_search";

  return null;
}

export function extractMemoryTopic(transcript: string): string {
  const patterns = [
    /\bwhat did we decide about\s+(.+?)\??$/i,
    /\bwhat should i remember about\s+(?:the\s+)?(.+?)\??$/i,
    /\bwhat did we change about\s+(.+?)\??$/i,
    /\bwhy did\s+(.+?)\??$/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  if (/\bblackcard\b/i.test(transcript)) return "blackcard";
  if (/\bplatform status\b/i.test(transcript)) return "platform status";
  if (/\bplatform health\b/i.test(transcript)) return "platform health";
  if (/\bvercel\b/i.test(transcript) || /\bcron\b/i.test(transcript)) return "vercel cron";
  if (/\bdeploy/i.test(transcript)) return "deployment";

  return transcript.slice(0, 80);
}

export async function retrieveFounderMemory(
  admin: SupabaseClient,
  transcript: string,
  intent: MemoryQueryIntent = resolveMemoryQueryIntent(transcript) ?? "summarize_memory",
): Promise<MemoryRetrievalResult> {
  const [memory, phaseSummary, recommendations, report] = await Promise.all([
    getNexusMemorySummary(admin, { limit: 120 }),
    getNexusPhaseSummary(admin),
    getFounderRecommendations(admin),
    loadReportContext(admin),
  ]);

  const topic = extractMemoryTopic(transcript);
  const relatedSignals: string[] = [];
  let highlights: string[] = [];
  let memoryEntries = memory.entries;
  let answer = "";

  switch (intent) {
    case "phase_status": {
      answer = `Current NEXUS phase: ${phaseSummary.currentPhase.phase_number} — ${phaseSummary.currentPhase.phase_name} (${phaseSummary.currentPhase.status}). ${phaseSummary.currentPhase.summary}`;
      highlights = [
        `Phase ${phaseSummary.currentPhase.phase_number}: ${phaseSummary.currentPhase.phase_name}`,
        `${phaseSummary.completedPhases.length} completed phases`,
      ];
      memoryEntries = phaseSummary.memoryEntries;
      break;
    }
    case "completed_this_week": {
      const since = startOfUtcWeekIso();
      const completed = memory.entries.filter((entry) => {
        const category = entryCategory(entry);
        const completedMarker =
          category === "milestone" ||
          entry.metadata.completion_status === "completed" ||
          entry.metadata.phase_status === "completed";
        return completedMarker && entry.occurred_at >= since;
      });
      memoryEntries = completed;
      highlights = completed.slice(0, 6).map((entry) => entry.title);
      answer =
        completed.length > 0
          ? `Completed this week: ${completed.map((entry) => entry.title).join("; ")}.`
          : "No completed milestones logged in founder memory this week. Check Platform Status for recent operational wins.";
      break;
    }
    case "launch_blockers": {
      const memoryBlockers = openBlockerEntries(memory.entries);
      const liveBlockers = recommendations.launchBlockers;
      memoryEntries = memoryBlockers;
      highlights = [
        ...memoryBlockers.map((entry) => entry.title),
        ...liveBlockers,
      ].slice(0, 8);
      answer =
        highlights.length > 0
          ? `Launch blockers: ${highlights.join("; ")}.`
          : "No unresolved launch blockers in memory or current platform signals.";
      if ((report.alerts.counts.critical ?? 0) > 0) {
        relatedSignals.push(`${report.alerts.counts.critical} critical alert(s) open`);
      }
      break;
    }
    case "last_major_fix": {
      const fixes = memory.entries.filter((entry) => {
        const category = entryCategory(entry);
        return (
          category === "technical_note" ||
          category === "milestone" ||
          entry.entry_type === "incident" ||
          entry.entry_type === "deployment"
        );
      });
      memoryEntries = fixes.slice(0, 5);
      const latest = fixes[0];
      answer = latest
        ? `Last major fix in memory: ${latest.title}. ${latest.summary}`
        : "No major fix recorded in founder memory yet.";
      highlights = fixes.slice(0, 3).map((entry) => entry.title);
      break;
    }
    case "deployment_issue": {
      const matches = memory.entries.filter(
        (entry) =>
          entryMatchesTopic(entry, topic) ||
          entryMatchesTopic(entry, "deployment") ||
          entryMatchesTopic(entry, "vercel") ||
          entryMatchesTopic(entry, "cron"),
      );
      memoryEntries = matches.slice(0, 8);
      highlights = matches.slice(0, 5).map((entry) => entry.title);
      answer =
        matches.length > 0
          ? `Founder memory on ${topic}: ${matches
              .slice(0, 3)
              .map((entry) => `${entry.title} — ${entry.summary}`)
              .join("; ")}.`
          : `No founder memory entries explicitly mention ${topic}. Review Platform Status and recent deployment entries.`;
      const failedDeployments = memory.entries.filter((entry) => entry.entry_type === "deployment");
      if (failedDeployments.length > 0) {
        relatedSignals.push(`Recent deployment memory: ${failedDeployments[0].title}`);
      }
      break;
    }
    case "topic_search": {
      const matches = memory.entries.filter((entry) => entryMatchesTopic(entry, topic));
      memoryEntries = matches.slice(0, 8);
      highlights = matches.slice(0, 5).map((entry) => entry.title);
      answer =
        matches.length > 0
          ? `Memory on ${topic}: ${matches
              .slice(0, 3)
              .map((entry) => `${entry.title} — ${entry.summary}`)
              .join("; ")}.`
          : `No founder memory entries mention ${topic} yet.`;
      break;
    }
    case "summarize_memory":
    default: {
      const recent = memory.entries.slice(0, 8);
      memoryEntries = recent;
      const blockers = openBlockerEntries(memory.entries);
      const decisions = memory.entries.filter((entry) => entryCategory(entry) === "decision").slice(0, 3);
      highlights = [
        ...blockers.slice(0, 2).map((entry) => `Blocker: ${entry.title}`),
        ...decisions.map((entry) => `Decision: ${entry.title}`),
        ...recent.slice(0, 2).map((entry) => entry.title),
      ];
      answer = `Founder memory summary: ${memory.entries.length} recent entries. ${
        blockers.length > 0 ? `${blockers.length} unresolved blocker(s). ` : ""
      }${
        decisions.length > 0
          ? `Recent decisions: ${decisions.map((entry) => entry.title).join("; ")}.`
          : "Capture decisions with “Save this decision…” in NEXUS Voice."
      }`;
      break;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    intent,
    query: transcript,
    answer,
    highlights,
    memoryEntries,
    relatedSignals,
  };
}

export async function getRelevantMemoryContext(
  admin: SupabaseClient,
  options?: { limit?: number },
): Promise<{
  blockers: MemoryEntryDbRow[];
  recentDecisions: MemoryEntryDbRow[];
  phaseSummary: Awaited<ReturnType<typeof getNexusPhaseSummary>>;
}> {
  const [memory, phaseSummary] = await Promise.all([
    getNexusMemorySummary(admin, { limit: options?.limit ?? 80 }),
    getNexusPhaseSummary(admin),
  ]);

  return {
    blockers: openBlockerEntries(memory.entries).slice(0, 5),
    recentDecisions: memory.entries
      .filter((entry) => entryCategory(entry) === "decision")
      .slice(0, 5),
    phaseSummary,
  };
}
