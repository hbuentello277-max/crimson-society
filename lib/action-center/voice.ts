import type { NexusActionType } from "@/lib/action-center/types";

const VOICE_ACTION_PATTERNS: Array<{ type: NexusActionType; patterns: RegExp[] }> = [
  {
    type: "launch_announcement",
    patterns: [/\bdraft\b.*\blaunch announcement\b/i, /\bcreate\b.*\blaunch announcement\b/i],
  },
  {
    type: "blackcard_promotion",
    patterns: [
      /\bcreate\b.*\bblackcard promotion\b/i,
      /\bdraft\b.*\bblackcard promotion\b/i,
      /\bblackcard promotion\b/i,
    ],
  },
  {
    type: "founder_update",
    patterns: [/\bprepare\b.*\bfounder update\b/i, /\bdraft\b.*\bfounder update\b/i],
  },
  {
    type: "weekly_report",
    patterns: [/\bcreate\b.*\bweekly report\b/i, /\bweekly report\b/i],
  },
  {
    type: "monthly_report",
    patterns: [/\bcreate\b.*\bmonthly report\b/i, /\bmonthly report\b/i],
  },
  {
    type: "instagram_caption",
    patterns: [
      /\bgenerate\b.*\binstagram\b/i,
      /\binstagram (?:post|caption)\b/i,
      /\bgenerate an instagram post\b/i,
    ],
  },
  {
    type: "tiktok_caption",
    patterns: [/\bgenerate\b.*\btiktok\b/i, /\btiktok caption\b/i],
  },
  {
    type: "community_update",
    patterns: [
      /\bgenerate\b.*\bcommunity announcement\b/i,
      /\bcommunity update\b/i,
      /\bcommunity announcement\b/i,
    ],
  },
  {
    type: "admin_briefing_draft",
    patterns: [/\badmin briefing\b/i, /\bprepare\b.*\bbriefing\b/i],
  },
  {
    type: "incident_summary",
    patterns: [/\bincident summary\b/i],
  },
  {
    type: "email_campaign_draft",
    patterns: [/\bemail campaign\b/i],
  },
  {
    type: "shop_drop_announcement",
    patterns: [/\bshop drop\b/i],
  },
  {
    type: "referral_campaign_draft",
    patterns: [/\breferral campaign\b/i],
  },
  {
    type: "blackcard_conversion_campaign",
    patterns: [/\bblackcard conversion campaign\b/i],
  },
  {
    type: "new_member_onboarding_message",
    patterns: [/\bonboarding message\b/i, /\bnew member onboarding\b/i],
  },
  {
    type: "beta_tester_recruitment_campaign",
    patterns: [/\bbeta tester recruitment\b/i, /\bbeta recruitment\b/i],
  },
  {
    type: "platform_announcement",
    patterns: [/\bplatform announcement\b/i],
  },
  {
    type: "meet_announcement",
    patterns: [/\bmeet announcement\b/i, /\bmeet reminder\b/i],
  },
  {
    type: "maintenance_notice",
    patterns: [/\bmaintenance notice\b/i],
  },
  {
    type: "youtube_description",
    patterns: [/\byoutube description\b/i],
  },
  {
    type: "founder_review_checklist",
    patterns: [/\bfounder review checklist\b/i],
  },
];

const QUEUE_PATTERNS = [
  /\bshow pending actions\b/i,
  /\bwhat actions (?:are )?waiting for approval\b/i,
  /\bwhat should i approve today\b/i,
  /\bwhat actions need approval\b/i,
  /\bpending actions\b/i,
  /\bwhat marketing actions have been prepared\b/i,
];

export function resolveNexusActionDraftType(transcript: string): NexusActionType | null {
  const normalized = transcript.trim();
  if (!normalized) {
    return null;
  }

  for (const entry of VOICE_ACTION_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(normalized))) {
      return entry.type;
    }
  }

  if (/\bdraft\b/i.test(normalized) || /\bprepare\b/i.test(normalized) || /\bcreate\b/i.test(normalized)) {
    if (/\blaunch\b/i.test(normalized)) return "launch_announcement";
    if (/\bblackcard\b/i.test(normalized)) return "blackcard_promotion";
    if (/\bfounder update\b/i.test(normalized)) return "founder_update";
    if (/\bweekly report\b/i.test(normalized)) return "weekly_report";
  }

  return null;
}

export function isNexusActionQueueQuery(transcript: string): boolean {
  const normalized = transcript.trim();
  return QUEUE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function formatNexusActionQueueResponse(
  actions: Array<{
    title: string;
    status: string;
    action_type: string;
  }>,
): string {
  if (actions.length === 0) {
    return "No action cards are waiting for approval right now.";
  }

  const top = actions
    .slice(0, 5)
    .map((action) => `${action.title} (${action.status.replace(/_/g, " ")})`)
    .join("; ");

  return `Pending actions: ${top}. Open Action Center to review, approve, or reject. No actions execute automatically.`;
}

export function formatNexusActionDraftResponse(input: {
  title: string;
  summary: string;
  reason: string;
  suggested_outcome: string;
}): string {
  return `Action prepared: ${input.title}. ${input.summary} Reason: ${input.reason} Suggested outcome: ${input.suggested_outcome} Review this in Action Center before approval.`;
}
