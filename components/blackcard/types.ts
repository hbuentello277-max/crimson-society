export type MembershipPlan = {
  id: string;
  plan_type: "monthly" | "yearly";
  title: string;
  description: string;
  price: number;
  stripe_price_id?: string | null;
  active: boolean;
  perks: string[];
  created_at: string | null;
  updated_at: string | null;
};

export type MembershipPlanRow = {
  id: string;
  plan_type: "monthly" | "yearly";
  title: string | null;
  description: string | null;
  price: number | string | null;
  stripe_price_id?: string | null;
  active: boolean | null;
  perks: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

export function formatPrice(value: number) {
  const normalized = Number(value || 0);
  return normalized % 1 === 0 ? normalized.toFixed(0) : normalized.toFixed(2);
}

export function sanitizePlan(row: MembershipPlanRow): MembershipPlan {
  return {
    id: row.id,
    plan_type: row.plan_type,
    title:
      row.title ??
      (row.plan_type === "monthly" ? "Monthly Plan" : "Yearly Plan"),
    description:
      row.description ??
      (row.plan_type === "monthly"
        ? "Flexible entry for Blackcard Access"
        : "Save $30/year · 3 months free"),
    price: Number(row.price ?? 0),
    stripe_price_id: row.stripe_price_id ?? null,
    active: row.active ?? true,
    perks: Array.isArray(row.perks) ? row.perks : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}