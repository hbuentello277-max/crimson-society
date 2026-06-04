import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import type { AdminCreditRewardRow, AdminRewardUpsertBody } from "@/lib/credits/admin-rewards-types";
import { isRewardCategory, isRewardKind, slugifyRewardSlug } from "@/lib/credits/admin-rewards-validation";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: Partial<AdminRewardUpsertBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (!body.title.trim()) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    patch.title = body.title.trim();
  }

  if (body.slug !== undefined) {
    const slug = slugifyRewardSlug(body.slug);
    if (!slug) {
      return NextResponse.json({ error: "slug is invalid" }, { status: 400 });
    }
    patch.slug = slug;
  }

  if (body.description !== undefined) {
    patch.description = body.description?.trim() || null;
  }

  if (body.credit_cost !== undefined) {
    if (!Number.isInteger(body.credit_cost) || body.credit_cost <= 0) {
      return NextResponse.json({ error: "credit_cost must be a positive integer" }, { status: 400 });
    }
    patch.credit_cost = body.credit_cost;
  }

  if (body.reward_category !== undefined) {
    if (!isRewardCategory(body.reward_category)) {
      return NextResponse.json({ error: "reward_category must be cash or community" }, { status: 400 });
    }
    patch.reward_category = body.reward_category;
  }

  if (body.reward_kind !== undefined) {
    if (!isRewardKind(body.reward_kind)) {
      return NextResponse.json({ error: "invalid reward_kind" }, { status: 400 });
    }
    patch.reward_kind = body.reward_kind;
  }

  if (body.metadata !== undefined) {
    patch.metadata = body.metadata;
  }

  if (body.image_path !== undefined) {
    patch.image_path = body.image_path;
  }

  if (body.inventory_total !== undefined) {
    patch.inventory_total =
      body.inventory_total == null ? null : Math.max(0, Math.floor(body.inventory_total));
  }

  if (body.inventory_remaining !== undefined) {
    patch.inventory_remaining =
      body.inventory_remaining == null ? null : Math.max(0, Math.floor(body.inventory_remaining));
  }

  if (body.requires_shirt_size !== undefined) {
    patch.requires_shirt_size = Boolean(body.requires_shirt_size);
  }

  if (body.is_active !== undefined) {
    patch.is_active = Boolean(body.is_active);
  }

  if (body.sort_order !== undefined) {
    patch.sort_order = Math.floor(body.sort_order);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = createAdminServiceClient();
  const { data, error } = await admin
    .from("crimson_credit_rewards")
    .update(patch)
    .eq("id", id)
    .select(REWARD_COLUMNS)
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (!data) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }

  return NextResponse.json({ reward: mapReward(data as Record<string, unknown>) });
}
