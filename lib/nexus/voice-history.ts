export type VoiceCommandHistoryEntry = {
  id: string;
  transcript: string;
  route: string | null;
  label: string | null;
  createdAt: string;
};

const STORAGE_KEY = "nexus-voice-command-history-v1";
const MAX_ENTRIES = 20;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readVoiceCommandHistory(): VoiceCommandHistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as VoiceCommandHistoryEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.transcript === "string" &&
          typeof entry.createdAt === "string",
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function appendVoiceCommandHistory(
  entry: Omit<VoiceCommandHistoryEntry, "id" | "createdAt">,
): VoiceCommandHistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  const nextEntry: VoiceCommandHistoryEntry = {
    id: `voice-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const next = [nextEntry, ...readVoiceCommandHistory()].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearVoiceCommandHistory() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
