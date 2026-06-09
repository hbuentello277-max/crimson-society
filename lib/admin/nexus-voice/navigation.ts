import {
  resolveVoiceCommand,
  type VoiceCommandAccess,
  type VoiceCommandMatch,
} from "@/lib/nexus/voice-commands";

export type NexusVoiceNavigationResult = {
  href: string;
  label: string;
  access: VoiceCommandAccess;
};

export function resolveNexusVoiceNavigation(transcript: string): NexusVoiceNavigationResult | null {
  const match = resolveVoiceCommand(transcript);
  if (!match) {
    return null;
  }

  return {
    href: match.href,
    label: match.label,
    access: match.access,
  };
}

export function formatNexusVoiceNavigationDenied(label: string): string {
  return `You need platform owner access to open ${label}.`;
}

export function formatNexusVoiceNavigationResponse(label: string): string {
  return `Opening ${label}. Tap Go when you are ready, or I can take you there now.`;
}

export function canAccessVoiceNavigation(
  navigation: Pick<NexusVoiceNavigationResult, "access">,
  isPlatformOwner: boolean,
): boolean {
  if (navigation.access === "admin") {
    return true;
  }

  return isPlatformOwner;
}

export type { VoiceCommandMatch };
