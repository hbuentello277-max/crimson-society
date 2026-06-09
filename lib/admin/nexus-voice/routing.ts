import type { NexusSeverity } from "@/lib/nexus/constants";
import type { NexusVoiceToolName } from "@/lib/admin/nexus-voice/types";

type ToolPattern = {
  tool: NexusVoiceToolName;
  patterns: RegExp[];
  exclude?: RegExp[];
};

const TOOL_PATTERNS: ToolPattern[] = [
  {
    tool: "getFailedPlatformJobs",
    patterns: [
      /\bfailed\b.*\bplatform jobs?\b/i,
      /\bshow\b.*\bfailed\b.*\bplatform jobs?\b/i,
      /\bplatform jobs?\b.*\bfailed\b/i,
    ],
  },
  {
    tool: "getNexusLastRun",
    patterns: [
      /\bwhen did nexus last run\b/i,
      /\bwhen\b.*\bnexus\b.*\blast run\b/i,
      /\blast nexus run\b/i,
      /\bwhen\b.*\bplatform jobs?\b.*\blast run\b/i,
    ],
  },
  {
    tool: "getPlatformJobsHealth",
    patterns: [
      /\bplatform jobs?\b.*\bhealthy\b/i,
      /\bare\b.*\bplatform jobs?\b.*\bhealthy\b/i,
      /\bcheck\b.*\bplatform jobs?\b/i,
      /\bplatform jobs?\b.*\b(status|health)\b/i,
      /\bscheduled\b.*\bplatform jobs?\b/i,
    ],
  },
  {
    tool: "getDailyOperatorBriefing",
    patterns: [
      /\bwhat needs my attention\b/i,
      /\bsummarize today\b/i,
      /\boperator briefing\b/i,
      /\btomorrow(?:'s|s)? action plan\b/i,
      /\bdaily operator briefing\b/i,
      /\bprepare tomorrow\b/i,
    ],
  },
  {
    tool: "createAdminBriefingDraft",
    patterns: [
      /\b(create|draft|prepare)\b.*\b(admin\s+)?briefing\b/i,
      /\bbriefing draft\b/i,
    ],
    exclude: [/\boperator briefing\b/i, /\bsummarize today\b/i],
  },
  {
    tool: "createSystemAlertDraft",
    patterns: [
      /\b(create|draft|prepare)\b.*\b(system\s+)?alert\b/i,
      /\balert draft\b/i,
    ],
  },
  {
    tool: "createRunbookDraft",
    patterns: [
      /\b(create|draft|prepare)\b.*\brunbook\b/i,
      /\brunbook draft\b/i,
    ],
  },
  {
    tool: "createNexusObservationDraft",
    patterns: [
      /\b(create|draft|prepare)\b.*\bobservation\b/i,
      /\bobservation draft\b/i,
    ],
  },
  {
    tool: "getNexusSystemHealth",
    patterns: [
      /\bcheck app health\b/i,
      /\bnexus\b.*\b(system\s+)?health\b/i,
      /\bplatform health\b/i,
      /\bintegration health\b/i,
    ],
    exclude: [/\bplatform jobs?\b/i],
  },
  {
    tool: "getCheckoutHealth",
    patterns: [
      /\bcheck checkout\b/i,
      /\bcheckout\b.*\b(issues?|health|problems?)\b/i,
      /\bshop checkout\b/i,
    ],
  },
  {
    tool: "getSignupHealth",
    patterns: [
      /\bcheck signup\b/i,
      /\bsignup\b.*\b(failures?|issues?|health)\b/i,
      /\bregistration\b.*\b(issues?|health)\b/i,
    ],
  },
  {
    tool: "getMediaProcessingHealth",
    patterns: [
      /\bmedia processing\b/i,
      /\bfailed media\b/i,
      /\bshow media processing failures\b/i,
      /\bvideo processing\b/i,
    ],
  },
  {
    tool: "getPushNotificationHealth",
    patterns: [
      /\bpush notification\b/i,
      /\bpush\b.*\b(health|failures?|issues?)\b/i,
      /\bnotification delivery\b/i,
    ],
  },
  {
    tool: "getCronHealth",
    patterns: [
      /\bcron\b.*\b(health|status)\b/i,
      /\bscheduled jobs?\b/i,
      /\bbackground jobs?\b/i,
    ],
    exclude: [/\bplatform jobs?\b/i],
  },
  {
    tool: "getRevenueRiskSummary",
    patterns: [
      /\brevenue risk\b/i,
      /\brevenue\b.*\b(risk|issues?|concerns?)\b/i,
      /\bpayment\b.*\b(issues?|risk)\b/i,
    ],
  },
  {
    tool: "getBlackcardConversionSummary",
    patterns: [
      /\bblack\s*card\b.*\b(conversion|rate|summary)\b/i,
      /\bconversion\b.*\bblack\s*card\b/i,
    ],
  },
  {
    tool: "getOrdersNeedingPickup",
    patterns: [
      /\borders?\b.*\b(needing|need|awaiting)\b.*\bpickup\b/i,
      /\bpickup orders?\b/i,
      /\blocal pickup\b/i,
    ],
  },
  {
    tool: "getFailedMediaJobs",
    patterns: [
      /\bfailed media jobs?\b/i,
      /\bmedia jobs?\b.*\bfailed\b/i,
    ],
  },
  {
    tool: "summarizePendingReports",
    patterns: [
      /\bsummarize\b.*\bpending reports?\b/i,
      /\bsummarize reports?\b/i,
      /\breport summary\b/i,
    ],
  },
  {
    tool: "getBlackcardCount",
    patterns: [
      /\bblack\s*card\b/i,
      /\bfounding\b.*\b(member|members)\b/i,
      /\bget blackcard count\b/i,
    ],
    exclude: [/\bconversion\b/i],
  },
  {
    tool: "getMemberCount",
    patterns: [
      /\b(member|members|user|users)\b.*\b(count|total|how many)\b/i,
      /\bhow many\b.*\b(member|members|users)\b/i,
      /\b(total|count)\b.*\b(member|members|users)\b/i,
      /\bget member count\b/i,
    ],
    exclude: [/\bblack\s*card\b/i],
  },
  {
    tool: "getRecentSignups",
    patterns: [
      /\brecent\b.*\b(sign\s*up|signup|signups|member|members)\b/i,
      /\bnew\b.*\b(member|members|signups?)\b/i,
      /\bget recent signups\b/i,
      /\blatest\b.*\b(signups?|members)\b/i,
    ],
  },
  {
    tool: "getPendingReports",
    patterns: [
      /\bpending\b.*\breports?\b/i,
      /\breports?\b.*\b(pending|queue|moderation)\b/i,
      /\bget pending reports\b/i,
      /\bmoderation\b.*\b(queue|reports?)\b/i,
    ],
    exclude: [/\bsummarize\b/i],
  },
  {
    tool: "getRevenueToday",
    patterns: [
      /\brevenue\b.*\btoday\b/i,
      /\bsales?\b.*\btoday\b/i,
      /\btoday\b.*\b(sales?|revenue|money|orders?)\b/i,
      /\bget revenue today\b/i,
      /\bshop\b.*\b(today|revenue|sales?)\b/i,
    ],
    exclude: [/\brisk\b/i],
  },
  {
    tool: "getSystemStatus",
    patterns: [
      /\bsystem\b.*\b(status)\b/i,
      /\bget system status\b/i,
      /\bhealth check\b/i,
    ],
    exclude: [/\bapp health\b/i, /\bnexus\b/i, /\bcheckout\b/i, /\bsignup\b/i],
  },
];

export const NEXUS_VOICE_HELP_RESPONSE =
  "I can report platform stats, monitor platform jobs, checkout, signups, media, push, and cron health, summarize operator priorities, and prepare confirmed drafts for alerts, briefings, runbooks, and observations.";

export function resolveNexusVoiceTool(transcript: string): NexusVoiceToolName | null {
  const normalized = transcript.trim();
  if (!normalized) {
    return null;
  }

  for (const entry of TOOL_PATTERNS) {
    if (entry.exclude?.some((pattern) => pattern.test(normalized))) {
      continue;
    }
    if (entry.patterns.some((pattern) => pattern.test(normalized))) {
      return entry.tool;
    }
  }

  return null;
}

export function parseSeverity(transcript: string): NexusSeverity {
  if (/\bcritical\b/i.test(transcript)) return "critical";
  if (/\bwarning\b/i.test(transcript)) return "warning";
  return "info";
}

export function parseBriefingType(transcript: string): "daily" | "weekly" {
  return /\bweekly\b/i.test(transcript) ? "weekly" : "daily";
}

export function parseQuotedValue(transcript: string, label: string): string | null {
  const pattern = new RegExp(`${label}\\s*[:\"]\\s*([^\"\\n]+)`, "i");
  const match = transcript.match(pattern);
  return match?.[1]?.trim() ?? null;
}

export function parseTitleFromTranscript(transcript: string, fallback: string): string {
  const titled = parseQuotedValue(transcript, "title");
  if (titled) return titled.slice(0, 120);

  const quoted = transcript.match(/"([^"]{3,120})"/);
  if (quoted?.[1]) return quoted[1].trim();

  const cleaned = transcript
    .replace(/\b(nexus[, ]*)?(create|draft|prepare|check|show|get|summarize)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length >= 3) {
    return cleaned.slice(0, 120);
  }

  return fallback;
}

export function parseStepsFromTranscript(transcript: string): string[] {
  const stepMatches = [...transcript.matchAll(/\bstep\s*\d*\s*[:-]\s*([^.;]+)/gi)];
  if (stepMatches.length > 0) {
    return stepMatches.map((match) => match[1].trim()).filter(Boolean).slice(0, 8);
  }

  const numbered = [...transcript.matchAll(/\b\d+[.)]\s*([^.;]+)/g)];
  if (numbered.length > 0) {
    return numbered.map((match) => match[1].trim()).filter(Boolean).slice(0, 8);
  }

  return [
    "Review the issue and confirm scope",
    "Apply the approved remediation",
    "Verify recovery and document the outcome",
  ];
}
