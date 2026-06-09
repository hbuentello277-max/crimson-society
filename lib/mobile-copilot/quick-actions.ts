import type { MobileCopilotQuickAction } from "@/lib/mobile-copilot/types";

export const MOBILE_COPILOT_QUICK_ACTIONS: MobileCopilotQuickAction[] = [
  {
    id: "executive-summary",
    label: "Executive Summary",
    kind: "voice",
    transcript: "Give me executive summary.",
  },
  {
    id: "todays-priorities",
    label: "Today's Priorities",
    kind: "voice",
    transcript: "Show today's priorities.",
  },
  {
    id: "founder-briefing",
    label: "Founder Briefing",
    kind: "voice",
    transcript: "Give me the founder briefing.",
  },
  {
    id: "launch-readiness",
    label: "Launch Readiness",
    kind: "voice",
    transcript: "Are we launch ready?",
  },
  {
    id: "pending-approvals",
    label: "Pending Approvals",
    kind: "voice",
    transcript: "What needs approval?",
  },
  {
    id: "biggest-risk",
    label: "Biggest Risk",
    kind: "voice",
    transcript: "What is the biggest risk today?",
  },
  {
    id: "biggest-opportunity",
    label: "Biggest Opportunity",
    kind: "voice",
    transcript: "What is the biggest opportunity today?",
  },
  {
    id: "build-launch-plan",
    label: "Build Launch Plan",
    kind: "voice",
    transcript: "Build a launch plan.",
  },
  {
    id: "build-revenue-plan",
    label: "Build Revenue Plan",
    kind: "voice",
    transcript: "Build a revenue recovery plan.",
  },
  {
    id: "open-action-center",
    label: "Open Action Center",
    kind: "navigation",
    href: "/admin/nexus/actions",
    transcript: "Open action center.",
  },
];

export function findQuickAction(id: string): MobileCopilotQuickAction | undefined {
  return MOBILE_COPILOT_QUICK_ACTIONS.find((action) => action.id === id);
}
