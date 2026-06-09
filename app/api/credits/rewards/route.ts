import { NextResponse } from "next/server";
import { mapProductToBuyProduct } from "@/lib/credits/buy-product";
import { formatCreditsRewardValueUsd } from "@/lib/credits/config";
import { memberCanRedeemFromProfileAndSubscription } from "@/lib/credits/member-redeem-eligibility";
import type { CreditsRewardCatalogItem, CreditsRewardsCatalogResponse } from "@/lib/credits/rewards-api-types";
import type { MembershipRow } from "@/lib/membership";
import type { Product } from "@/lib/products";
import { parseSizeInventory } from "@/lib/shop/inventory";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

const PRODUCT_COLUMNS =
  "id, slug, name, description, credit_cost, reward_category, reward_kind, images, inventory_total, inventory_remaining, size_inventory, requires_shirt_size, status, sort_order, credit_reward_id, linked_merch_product_id";

const MERCH_PRODUCT_COLUMNS =
  "id, slug, name, price, sizes, size_inventory, inventory_remaining, requires_shirt_size, status, product_type";

export async function GET(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, authDetail: auth.authDetail },
      { status: 401 },
    );
  }

  const [productsResult, summaryResult, profileResult, subscriptionResult, cashUsedResult, cashCapResult] =
    await Promise.all([
      auth.supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("product_type", "credit_reward")
        .neq("status", "coming_soon")
        .neq("status", "archived")
        .not("credit_reward_id", "is", null)
        .order("sort_order", { ascending: true })
        .order("credit_cost", { ascending: true }),
      auth.supabase.rpc("get_crimson_credits_summary", { p_user_id: auth.userId }),
      auth.supabase
        .from("profiles")
        .select(
          "role, is_admin, status, is_premium, premium_tier, premium_expires_at, is_founding_blackcard, founding_blackcard_granted_at, membership_tier, blackcard_public",
        )
        .eq("id", auth.userId)
        .maybeSingle(),
      auth.supabase
        .from("subscriptions")
        .select("status, plan_type, current_period_end")
        .eq("user_id", auth.userId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      auth.supabase.rpc("crimson_credits_monthly_cash_redemption_used", {
        p_user_id: auth.userId,
      }),
      auth.supabase.rpc("crimson_credits_monthly_cash_redemption_cap"),
    ]);

  if (productsResult.error) {
    return NextResponse.json({ error: productsResult.error.message }, { status: 500 });
  }

  if (summaryResult.error) {
    return NextResponse.json({ error: summaryResult.error.message }, { status: 500 });
  }

  if (profileResult.error || cashUsedResult.error || cashCapResult.error) {
    const message =
      profileResult.error?.message ||
      cashUsedResult.error?.message ||
      cashCapResult.error?.message ||
      "Could not load redemption summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const subscription = subscriptionResult.data as MembershipRow | null;
  const canRedeem = memberCanRedeemFromProfileAndSubscription(
    profileResult.data,
    subscription,
  );

  const balance =
    (summaryResult.data as { credits_balance?: number } | null)?.credits_balance ?? 0;

  const rewardRows = (productsResult.data ?? []).filter((row) => row.credit_reward_id);
  const linkedMerchIds = [
    ...new Set(
      rewardRows
        .map((row) => row.linked_merch_product_id as string | null)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const merchById = new Map<string, Product>();
  if (linkedMerchIds.length > 0) {
    const { data: merchRows, error: merchError } = await auth.supabase
      .from("products")
      .select(MERCH_PRODUCT_COLUMNS)
      .in("id", linkedMerchIds);

    if (merchError) {
      return NextResponse.json({ error: merchError.message }, { status: 500 });
    }

    for (const row of merchRows ?? []) {
      merchById.set(row.id as string, row as Product);
    }
  }

  const rewards: CreditsRewardCatalogItem[] = rewardRows.map((row) => {
    const outOfStock =
      row.status === "out_of_stock" ||
      (row.inventory_remaining != null && row.inventory_remaining <= 0);

    const linkedMerch = row.linked_merch_product_id
      ? merchById.get(row.linked_merch_product_id as string)
      : undefined;

    return {
      id: row.credit_reward_id as string,
      product_id: row.id,
      slug: row.slug,
      title: row.name,
      description: row.description,
      credit_cost: row.credit_cost ?? 0,
      reward_category: row.reward_category as CreditsRewardCatalogItem["reward_category"],
      reward_kind: row.reward_kind as CreditsRewardCatalogItem["reward_kind"],
      metadata: {},
      image_url: row.images?.[0] ?? null,
      inventory_total: row.inventory_total,
      inventory_remaining: outOfStock ? 0 : row.inventory_remaining,
      size_inventory: parseSizeInventory(row.size_inventory),
      requires_shirt_size: Boolean(row.requires_shirt_size),
      is_active: row.status !== "coming_soon" && row.status !== "archived",
      sort_order: row.sort_order ?? 0,
      buy_product: linkedMerch ? mapProductToBuyProduct(linkedMerch) : null,
    };
  });

  const payload: CreditsRewardsCatalogResponse = {
    rewards,
    summary: {
      credits_balance: balance,
      stored_reward_value_usd: formatCreditsRewardValueUsd(balance),
      monthly_cash_redemption_used: Number(cashUsedResult.data ?? 0),
      monthly_cash_redemption_cap: Number(cashCapResult.data ?? 500),
      can_redeem: canRedeem,
    },
  };

  return NextResponse.json(payload);
}
