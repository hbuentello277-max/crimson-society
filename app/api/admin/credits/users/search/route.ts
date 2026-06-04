import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import {
  resolveAvatarUrl,
  resolveMembershipLabel,
} from "@/lib/credits/admin-user-display";

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 20;

function escapeIlikePattern(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get("q") ?? "").trim();

  if (rawQuery.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ users: [] });
  }

  const pattern = `%${escapeIlikePattern(rawQuery)}%`;

  try {
    const adminClient = createAdminServiceClient();

    const { data, error } = await adminClient
      .from("profiles")
      .select(
        "id, username, display_name, full_name, email, avatar_url, profile_image_url, is_premium, premium_tier, membership_tier, is_founding_blackcard, status",
      )
      .or(
        `username.ilike.${pattern},display_name.ilike.${pattern},full_name.ilike.${pattern},email.ilike.${pattern}`,
      )
      .order("display_name", { ascending: true, nullsFirst: false })
      .limit(MAX_RESULTS);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (data ?? []).map((profile) => ({
      id: profile.id,
      username: profile.username ?? null,
      display_name: profile.display_name ?? profile.full_name ?? null,
      full_name: profile.full_name ?? null,
      email: profile.email ?? null,
      avatar_url: resolveAvatarUrl(profile),
      membership_label: resolveMembershipLabel(profile),
      status: profile.status ?? null,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
