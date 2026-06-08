export type VoiceCommandMatch = {
  href: string;
  label: string;
  phrase: string;
};

type VoiceCommandDefinition = {
  phrases: string[];
  href: string;
  label: string;
};

export const NEXUS_VOICE_COMMANDS: VoiceCommandDefinition[] = [
  {
    phrases: ["open founder dashboard", "founder dashboard", "founder", "go home", "open home"],
    href: "/admin/nexus",
    label: "Founder Dashboard",
  },
  {
    phrases: ["open overview", "overview", "open command overview"],
    href: "/admin/nexus/overview",
    label: "Overview",
  },
  {
    phrases: ["open commands", "commands", "open command center"],
    href: "/admin/nexus/commands",
    label: "Commands",
  },
  {
    phrases: ["open alerts", "alerts", "show alerts"],
    href: "/admin/nexus/alerts",
    label: "Alerts",
  },
  {
    phrases: ["open incidents", "incidents", "show incidents"],
    href: "/admin/nexus/incidents",
    label: "Incidents",
  },
  {
    phrases: ["open reports", "reports", "show reports"],
    href: "/admin/nexus/reports",
    label: "Reports",
  },
  {
    phrases: ["open scenarios", "scenarios", "show scenarios"],
    href: "/admin/nexus/scenarios",
    label: "Scenarios",
  },
  {
    phrases: [
      "open platform status",
      "platform status",
      "open mission health",
      "mission health",
      "system status",
    ],
    href: "/admin/nexus/mission-health",
    label: "Platform Status",
  },
  {
    phrases: ["open chat", "chat", "open nexus chat"],
    href: "/admin/nexus/chat",
    label: "Chat",
  },
  {
    phrases: ["open voice", "voice", "open voice command"],
    href: "/admin/nexus/voice",
    label: "Voice",
  },
  {
    phrases: ["open infrastructure", "infrastructure", "system health", "open system health"],
    href: "/admin/nexus/system-health",
    label: "Infrastructure",
  },
  {
    phrases: ["open metrics", "metrics"],
    href: "/admin/nexus/metrics",
    label: "Metrics",
  },
  {
    phrases: ["open runbooks", "runbooks"],
    href: "/admin/nexus/runbooks",
    label: "Runbooks",
  },
  {
    phrases: ["open war rooms", "war rooms"],
    href: "/admin/nexus/war-rooms",
    label: "War Rooms",
  },
  {
    phrases: ["open briefings", "briefings"],
    href: "/admin/nexus/briefings",
    label: "Briefings",
  },
];

function normalizeVoiceTranscript(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveVoiceCommand(transcript: string): VoiceCommandMatch | null {
  const normalized = normalizeVoiceTranscript(transcript);
  if (!normalized) {
    return null;
  }

  for (const command of NEXUS_VOICE_COMMANDS) {
    for (const phrase of command.phrases) {
      const normalizedPhrase = normalizeVoiceTranscript(phrase);
      if (normalized === normalizedPhrase || normalized.includes(normalizedPhrase)) {
        return {
          href: command.href,
          label: command.label,
          phrase: phrase,
        };
      }
    }
  }

  return null;
}

export function listVoiceCommandExamples() {
  return NEXUS_VOICE_COMMANDS.map((command) => ({
    label: command.label,
    href: command.href,
    example: command.phrases[0],
  }));
}
