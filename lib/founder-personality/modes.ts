import type { FounderMode } from "@/lib/founder-personality/types";
import { DEFAULT_FOUNDER_MODE, FOUNDER_MODES } from "@/lib/founder-personality/types";

export const FOUNDER_MODE_STORAGE_KEY = "nexus-founder-mode-v1";

export function isFounderMode(value: string): value is FounderMode {
  return (FOUNDER_MODES as readonly string[]).includes(value);
}

export function readFounderModePreference(): FounderMode {
  if (typeof window === "undefined") {
    return DEFAULT_FOUNDER_MODE;
  }

  const stored = window.localStorage.getItem(FOUNDER_MODE_STORAGE_KEY);
  return stored && isFounderMode(stored) ? stored : DEFAULT_FOUNDER_MODE;
}

export function writeFounderModePreference(mode: FounderMode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(FOUNDER_MODE_STORAGE_KEY, mode);
}

export function normalizeFounderMode(mode: string | null | undefined): FounderMode {
  if (mode && isFounderMode(mode)) {
    return mode;
  }
  return DEFAULT_FOUNDER_MODE;
}

export function resolveFounderModeCommand(transcript: string): FounderMode | null {
  const normalized = transcript.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (/\b(operator|operations?)\b.*\bmode\b/i.test(normalized) || normalized === "switch to operator mode") {
    return "operator";
  }
  if (/\bfounder\b.*\bmode\b/i.test(normalized) || normalized === "switch to founder mode") {
    return "founder";
  }
  if (/\blaunch\b.*\bmode\b/i.test(normalized) || normalized === "switch to launch mode") {
    return "launch";
  }
  if (/\bgrowth\b.*\bmode\b/i.test(normalized) || normalized === "switch to growth mode") {
    return "growth";
  }

  return null;
}

export function formatFounderModeAcknowledgement(mode: FounderMode): string {
  switch (mode) {
    case "operator":
      return "Operator mode enabled. I will focus on alerts, jobs, incidents, and Platform Health.";
    case "founder":
      return "Founder mode enabled. I will focus on growth, launch readiness, and business impact.";
    case "launch":
      return "Launch mode enabled. I will focus on blockers, readiness score, and remaining work.";
    case "growth":
      return "Growth mode enabled. I will focus on members, Blackcard, revenue, and engagement.";
    default:
      return "Founder mode enabled.";
  }
}

export function modeLensLabel(mode: FounderMode): string {
  switch (mode) {
    case "operator":
      return "operational";
    case "founder":
      return "strategic";
    case "launch":
      return "launch";
    case "growth":
      return "growth";
    default:
      return "founder";
  }
}
