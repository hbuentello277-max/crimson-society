export type NexusVoiceHistoryKind = "command" | "action" | "operator" | "confirmation";

export type NexusVoiceHistoryEntry = {
  id: string;
  transcript: string;
  response: string;
  tool: string | null;
  kind: NexusVoiceHistoryKind;
  createdAt: string;
};

const STORAGE_KEY = "nexus-admin-voice-history-v2";
const MAX_ENTRIES = 30;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function inferKind(tool: string | null): NexusVoiceHistoryKind {
  if (!tool) return "command";
  if (tool.startsWith("create")) return "action";
  if (tool.startsWith("get") && tool.includes("Health")) return "operator";
  if (tool === "getDailyOperatorBriefing" || tool === "getRevenueRiskSummary") return "operator";
  if (tool === "confirm") return "confirmation";
  return "command";
}

export function readNexusVoiceHistory(): NexusVoiceHistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = window.localStorage.getItem("nexus-admin-voice-history-v1");
      if (!legacy) return [];
      const parsedLegacy = JSON.parse(legacy) as NexusVoiceHistoryEntry[];
      if (!Array.isArray(parsedLegacy)) return [];
      return parsedLegacy.map((entry) => ({
        ...entry,
        kind: entry.kind ?? inferKind(entry.tool),
      }));
    }

    const parsed = JSON.parse(raw) as NexusVoiceHistoryEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.transcript === "string" &&
          typeof entry.response === "string" &&
          typeof entry.createdAt === "string",
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function appendNexusVoiceHistory(
  entry: Omit<NexusVoiceHistoryEntry, "id" | "createdAt" | "kind"> & {
    kind?: NexusVoiceHistoryKind;
  },
): NexusVoiceHistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  const nextEntry: NexusVoiceHistoryEntry = {
    id: `nexus-voice-${Date.now()}`,
    createdAt: new Date().toISOString(),
    kind: entry.kind ?? inferKind(entry.tool),
    ...entry,
  };

  const next = [nextEntry, ...readNexusVoiceHistory()].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearNexusVoiceHistory() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
