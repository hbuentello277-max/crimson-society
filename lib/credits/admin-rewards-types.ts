import type {
  CrimsonCreditRedemptionStatus,
  CrimsonCreditRewardCategory,
  CrimsonCreditRewardKind,
} from "@/lib/credits/types";

export type AdminCreditRewardRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  credit_cost: number;
  reward_category: CrimsonCreditRewardCategory;
  reward_kind: CrimsonCreditRewardKind;
  metadata: Record<string, unknown>;
  image_path: string | null;
  image_url: string | null;
  inventory_total: number | null;
  inventory_remaining: number | null;
  requires_shirt_size: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminCreditRedemptionRow = {
  id: string;
  user_id: string;
  reward_id: string;
  reward_slug: string;
  reward_title: string;
  reward_category: CrimsonCreditRewardCategory;
  credits_spent: number;
  status: CrimsonCreditRedemptionStatus;
  shirt_size: string | null;
  fulfillment_notes: string | null;
  refund_transaction_id: string | null;
  created_at: string;
  member_username: string | null;
  member_display_name: string | null;
};

export type AdminRewardUpsertBody = {
  slug?: string;
  title: string;
  description?: string | null;
  credit_cost: number;
  reward_category: CrimsonCreditRewardCategory;
  reward_kind: CrimsonCreditRewardKind;
  metadata?: Record<string, unknown>;
  image_path?: string | null;
  inventory_total?: number | null;
  inventory_remaining?: number | null;
  requires_shirt_size?: boolean;
  is_active?: boolean;
  sort_order?: number;
};
