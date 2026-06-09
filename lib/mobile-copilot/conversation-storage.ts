import type { CopilotConversationEntry } from "@/lib/mobile-copilot/types";

const STORAGE_KEY = "nexus-mobile-copilot-conversation-v1";
const MAX_ENTRIES = 80;

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readCopilotConversation(): CopilotConversationEntry[] {
  if (!canUseSessionStorage()) {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CopilotConversationEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.content === "string" &&
          typeof entry.createdAt === "string" &&
          (entry.role === "founder" || entry.role === "nexus"),
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function appendCopilotConversation(
  entry: Omit<CopilotConversationEntry, "id" | "createdAt">,
): CopilotConversationEntry[] {
  if (!canUseSessionStorage()) {
    return [];
  }

  const nextEntry: CopilotConversationEntry = {
    id: `copilot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const next = [nextEntry, ...readCopilotConversation()].slice(0, MAX_ENTRIES);
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearCopilotConversation() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
