export type VoiceCommandAccess = "owner" | "admin";

export type VoiceCommandMatch = {
  href: string;
  label: string;
  phrase: string;
  access: VoiceCommandAccess;
};

type VoiceCommandDefinition = {
  phrases: string[];
  href: string;
  label: string;
  access: VoiceCommandAccess;
};

export const NEXUS_VOICE_COMMANDS: VoiceCommandDefinition[] = [
  {
    phrases: [
      "open copilot mode",
      "open mobile copilot",
      "copilot mode",
      "open founder copilot",
      "show founder snapshot",
      "open launch plan",
      "show launch plan",
    ],
    href: "/admin/nexus/copilot",
    label: "Mobile Copilot",
    access: "owner",
  },
  {
    phrases: [
      "open founder",
      "open founder dashboard",
      "founder dashboard",
      "founder",
      "go home",
      "open home",
    ],
    href: "/admin/nexus",
    label: "Founder",
    access: "owner",
  },
  {
    phrases: [
      "open executive command center",
      "executive command center",
      "open command center",
      "executive summary",
    ],
    href: "/admin/nexus",
    label: "Executive Command Center",
    access: "owner",
  },
  {
    phrases: ["show my founder dashboard", "open founder dashboard home"],
    href: "/admin/nexus",
    label: "Founder",
    access: "owner",
  },
  {
    phrases: ["open approvals", "open approval inbox", "show approvals"],
    href: "/admin/nexus/actions",
    label: "Actions",
    access: "owner",
  },
  {
    phrases: ["go to shop admin", "open shop admin", "shop admin", "open shop"],
    href: "/admin/shop",
    label: "Shop Admin",
    access: "admin",
  },
  {
    phrases: ["go to blackcard", "open blackcard", "blackcard admin"],
    href: "/admin/blackcard",
    label: "Blackcard",
    access: "admin",
  },
  {
    phrases: ["go to rewards", "open rewards", "rewards admin"],
    href: "/admin/rewards",
    label: "Rewards",
    access: "admin",
  },
  {
    phrases: ["open overview", "overview", "open command overview"],
    href: "/admin/nexus/overview",
    label: "Overview",
    access: "owner",
  },
  {
    phrases: ["open commands", "commands", "open command center"],
    href: "/admin/nexus/commands",
    label: "Commands",
    access: "owner",
  },
  {
    phrases: ["open action center", "open actions", "action center", "show action center"],
    href: "/admin/nexus/actions",
    label: "Actions",
    access: "owner",
  },
  {
    phrases: ["open alerts", "alerts", "show alerts"],
    href: "/admin/nexus/alerts",
    label: "Alerts",
    access: "owner",
  },
  {
    phrases: ["open incidents", "incidents", "show incidents"],
    href: "/admin/nexus/incidents",
    label: "Incidents",
    access: "owner",
  },
  {
    phrases: ["open reports", "reports", "show reports"],
    href: "/admin/nexus/reports",
    label: "Reports",
    access: "owner",
  },
  {
    phrases: ["open scenarios", "scenarios", "show scenarios"],
    href: "/admin/nexus/scenarios",
    label: "Scenarios",
    access: "owner",
  },
  {
    phrases: [
      "open platform health",
      "platform health",
      "open mission health",
      "mission health",
      "system status",
    ],
    href: "/admin/nexus/mission-health",
    label: "Platform Health",
    access: "owner",
  },
  {
    phrases: [
      "open platform status",
      "platform status",
      "open mission control",
      "mission control",
    ],
    href: "/admin/nexus/mission-control",
    label: "Platform Status",
    access: "owner",
  },
  {
    phrases: ["open chat", "chat", "open nexus chat"],
    href: "/admin/nexus/chat",
    label: "Chat",
    access: "owner",
  },
  {
    phrases: ["open voice", "voice", "open voice command"],
    href: "/admin/nexus/voice",
    label: "Voice",
    access: "owner",
  },
  {
    phrases: ["open infrastructure", "infrastructure", "system health", "open system health"],
    href: "/admin/nexus/system-health",
    label: "Infrastructure",
    access: "owner",
  },
  {
    phrases: ["open metrics", "metrics"],
    href: "/admin/nexus/metrics",
    label: "Metrics",
    access: "owner",
  },
  {
    phrases: ["open runbooks", "runbooks"],
    href: "/admin/nexus/runbooks",
    label: "Runbooks",
    access: "owner",
  },
  {
    phrases: ["open war rooms", "war rooms"],
    href: "/admin/nexus/war-rooms",
    label: "War Rooms",
    access: "owner",
  },
  {
    phrases: ["open briefings", "briefings"],
    href: "/admin/nexus/briefings",
    label: "Briefings",
    access: "owner",
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

function hasNavigationIntent(normalized: string) {
  return (
    normalized.startsWith("open ") ||
    normalized.startsWith("go to ") ||
    normalized.startsWith("go ") ||
    normalized.startsWith("show ")
  );
}

function matchesNavigationPhrase(normalized: string, phrase: string) {
  const normalizedPhrase = normalizeVoiceTranscript(phrase);
  if (!normalizedPhrase) {
    return false;
  }

  if (normalized === normalizedPhrase) {
    return true;
  }

  if (!hasNavigationIntent(normalized)) {
    return false;
  }

  return normalized.includes(normalizedPhrase);
}

export function resolveVoiceCommand(transcript: string): VoiceCommandMatch | null {
  const normalized = normalizeVoiceTranscript(transcript);
  if (!normalized) {
    return null;
  }

  for (const command of NEXUS_VOICE_COMMANDS) {
    for (const phrase of command.phrases) {
      if (matchesNavigationPhrase(normalized, phrase)) {
        return {
          href: command.href,
          label: command.label,
          phrase: phrase,
          access: command.access,
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
