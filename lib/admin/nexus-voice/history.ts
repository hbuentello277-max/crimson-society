export type NexusVoiceHistoryEntry = {
  id: string;
  transcript: string;
  response: string;
  tool: string | null;
  createdAt: string;
};

const STORAGE_KEY = "nexus-admin-voice-history-v1";
const MAX_ENTRIES = 20;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readNexusVoiceHistory(): NexusVoiceHistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
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
  entry: Omit<NexusVoiceHistoryEntry, "id" | "createdAt">,
): NexusVoiceHistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  const nextEntry: NexusVoiceHistoryEntry = {
    id: `nexus-voice-${Date.now()}`,
    createdAt: new Date().toISOString(),
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
