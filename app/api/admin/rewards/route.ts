import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import type { AdminCreditRewardRow, AdminRewardUpsertBody } from "@/lib/credits/admin-rewards-types";
import {
  defaultRewardKindForCategory,
  isRewardCategory,
  isRewardKind,
  slugifyRewardSlug,
} from "@/lib/credits/admin-rewards-validation";
import { crimsonCreditRewardImagePublicUrl } from "@/lib/credits/reward-images";

const REWARD_COLUMNS =
  "id, slug, title, description, credit_cost, reward_category, reward_kind, metadata, image_path, inventory_total, inventory_remaining, requires_shirt_size, is_active, sort_order, created_at, updated_at";

function mapReward(row: Record<string, unknown>): AdminCreditRewardRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    credit_cost: Number(row.credit_cost),
    reward_category: row.reward_category as AdminCreditRewardRow["reward_category"],
    reward_kind: row.reward_kind as AdminCreditRewardRow["reward_kind"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    image_path: (row.image_path as string | null) ?? null,
    image_url: crimsonCreditRewardImagePublicUrl((row.image_path as string | null) ?? null),
    inventory_total: row.inventory_total == null ? null : Number(row.inventory_total),
    inventory_remaining:
      row.inventory_remaining == null ? null : Number(row.inventory_remaining),
    requires_shirt_size: Boolean(row.requires_shirt_size),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const admin = createAdminServiceClient();
  const { data, error } = await admin
    .from("crimson_credit_rewards")
    .select(REWARD_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("credit_cost", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    rewards: (data ?? []).map((row) => mapReward(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: AdminRewardUpsertBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!Number.isInteger(body.credit_cost) || body.credit_cost <= 0) {
    return NextResponse.json({ error: "credit_cost must be a positive integer" }, { status: 400 });
  }

  if (!isRewardCategory(body.reward_category)) {
    return NextResponse.json({ error: "reward_category must be cash or community" }, { status: 400 });
  }

  const rewardKind =
    body.reward_kind && isRewardKind(body.reward_kind)
      ? body.reward_kind
      : defaultRewardKindForCategory(body.reward_category);

  const slug = slugifyRewardSlug(body.slug?.trim() || body.title);
  if (!slug) {
    return NextResponse.json({ error: "slug could not be generated" }, { status: 400 });
  }

  const inventoryTotal =
    body.inventory_total == null ? null : Math.max(0, Math.floor(body.inventory_total));
  const inventoryRemaining =
    body.inventory_remaining == null
      ? inventoryTotal
      : Math.max(0, Math.floor(body.inventory_remaining));

  const admin = createAdminServiceClient();
  const { data, error } = await admin
    .from("crimson_credit_rewards")
    .insert({
      slug,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      credit_cost: body.credit_cost,
      reward_category: body.reward_category,
      reward_kind: rewardKind,
      metadata: body.metadata ?? {},
      image_path: body.image_path ?? null,
      inventory_total: inventoryTotal,
      inventory_remaining: inventoryTotal == null ? null : inventoryRemaining,
      requires_shirt_size: Boolean(body.requires_shirt_size),
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select(REWARD_COLUMNS)
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ reward: mapReward(data as Record<string, unknown>) }, { status: 201 });
}
