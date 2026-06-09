export type NexusActionCategory = "communication" | "marketing" | "operational" | "growth";

export type NexusActionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "executed"
  | "rejected";

export type NexusActionType =
  | "founder_update"
  | "platform_announcement"
  | "meet_announcement"
  | "blackcard_promotion"
  | "community_update"
  | "maintenance_notice"
  | "instagram_caption"
  | "tiktok_caption"
  | "youtube_description"
  | "email_campaign_draft"
  | "launch_announcement"
  | "shop_drop_announcement"
  | "admin_briefing_draft"
  | "incident_summary"
  | "weekly_report"
  | "monthly_report"
  | "founder_review_checklist"
  | "referral_campaign_draft"
  | "blackcard_conversion_campaign"
  | "new_member_onboarding_message"
  | "beta_tester_recruitment_campaign";

export type NexusActionCard = {
  id: string;
  action_category: NexusActionCategory;
  action_type: NexusActionType;
  title: string;
  summary: string;
  reason: string;
  suggested_outcome: string;
  generated_content: string;
  status: NexusActionStatus;
  approval_required: boolean;
  created_by_label: string;
  created_by_user_id: string | null;
  approved_at: string | null;
  approved_by: string | null;
  executed_at: string | null;
  executed_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NexusActionCardSummary = Pick<
  NexusActionCard,
  | "id"
  | "action_category"
  | "action_type"
  | "title"
  | "summary"
  | "reason"
  | "suggested_outcome"
  | "status"
  | "approval_required"
  | "created_by_label"
  | "created_at"
  | "updated_at"
>;

export type NexusActionQueueResponse = {
  collected_at: string;
  counts: Record<NexusActionStatus | "all", number>;
  counts_by_category: Partial<Record<NexusActionCategory, number>>;
  actions: NexusActionCard[];
  access: "owner" | "admin";
};

export type UpdateNexusActionInput = {
  action: "approve" | "reject" | "execute" | "edit" | "submit";
  title?: string;
  summary?: string;
  reason?: string;
  suggested_outcome?: string;
  generated_content?: string;
};
