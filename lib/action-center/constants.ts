import type { NexusActionCategory, NexusActionType } from "@/lib/action-center/types";

export const NEXUS_ACTION_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "executed",
  "rejected",
] as const;

export const NEXUS_ACTION_CATEGORIES: NexusActionCategory[] = [
  "communication",
  "marketing",
  "operational",
  "growth",
];

export const NEXUS_ACTION_TYPES: NexusActionType[] = [
  "founder_update",
  "platform_announcement",
  "meet_announcement",
  "blackcard_promotion",
  "community_update",
  "maintenance_notice",
  "instagram_caption",
  "tiktok_caption",
  "youtube_description",
  "email_campaign_draft",
  "launch_announcement",
  "shop_drop_announcement",
  "admin_briefing_draft",
  "incident_summary",
  "weekly_report",
  "monthly_report",
  "founder_review_checklist",
  "referral_campaign_draft",
  "blackcard_conversion_campaign",
  "new_member_onboarding_message",
  "beta_tester_recruitment_campaign",
];

export const ACTION_TYPE_CATEGORY: Record<NexusActionType, NexusActionCategory> = {
  founder_update: "communication",
  platform_announcement: "communication",
  meet_announcement: "communication",
  blackcard_promotion: "communication",
  community_update: "communication",
  maintenance_notice: "communication",
  instagram_caption: "marketing",
  tiktok_caption: "marketing",
  youtube_description: "marketing",
  email_campaign_draft: "marketing",
  launch_announcement: "marketing",
  shop_drop_announcement: "marketing",
  admin_briefing_draft: "operational",
  incident_summary: "operational",
  weekly_report: "operational",
  monthly_report: "operational",
  founder_review_checklist: "operational",
  referral_campaign_draft: "growth",
  blackcard_conversion_campaign: "growth",
  new_member_onboarding_message: "growth",
  beta_tester_recruitment_campaign: "growth",
};

export const ACTION_TYPE_LABELS: Record<NexusActionType, string> = {
  founder_update: "Founder update",
  platform_announcement: "Platform announcement",
  meet_announcement: "Meet announcement",
  blackcard_promotion: "Blackcard promotion",
  community_update: "Community update",
  maintenance_notice: "Maintenance notice",
  instagram_caption: "Instagram caption",
  tiktok_caption: "TikTok caption",
  youtube_description: "YouTube description",
  email_campaign_draft: "Email campaign draft",
  launch_announcement: "Launch announcement",
  shop_drop_announcement: "Shop drop announcement",
  admin_briefing_draft: "Admin briefing draft",
  incident_summary: "Incident summary",
  weekly_report: "Weekly report",
  monthly_report: "Monthly report",
  founder_review_checklist: "Founder review checklist",
  referral_campaign_draft: "Referral campaign draft",
  blackcard_conversion_campaign: "Blackcard conversion campaign",
  new_member_onboarding_message: "New member onboarding message",
  beta_tester_recruitment_campaign: "Beta tester recruitment campaign",
};

export const OPERATIONAL_ACTION_TYPES = NEXUS_ACTION_TYPES.filter(
  (type) => ACTION_TYPE_CATEGORY[type] === "operational",
);

export function actionCategoryForType(type: NexusActionType): NexusActionCategory {
  return ACTION_TYPE_CATEGORY[type];
}

export function isOperationalActionType(type: NexusActionType): boolean {
  return ACTION_TYPE_CATEGORY[type] === "operational";
}
