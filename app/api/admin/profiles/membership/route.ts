import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { syncBlackcardPublicForUser } from "@/lib/stripe/sync-blackcard-public";

type MembershipAction =
  | "grant"
  | "revoke"
  | "extend_30"
  | "extend_90"
  | "set_expiration"
  | "grant_founding"
  | "revoke_founding";

type MembershipRequestBody = {
  profileId?: string;
  action?: MembershipAction;
  expiresAt?: string | null;
  membership?: "regular" | "blackcard";
};

const PROFILE_SELECT =
  "id, username, email, display_name, role, status, created_at, is_premium, premium_tier, premium_since, premium_expires_at, blackcard_public, is_founding_blackcard, founding_blackcard_granted_at";

function addDays(from: Date, days: number) {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function resolveExpiration(base: string | null | undefined, days: number) {
  const anchor =
    base && new Date(base).getTime() > Date.now() ? new Date(base) : new Date();
  return addDays(anchor, days);
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: MembershipRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { profileId, action, expiresAt, membership } = body;

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const adminClient = createAdminServiceClient();

  const { data: existingProfile, error: existingError } = await adminClient
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", profileId)
    .single();

  if (existingError || !existingProfile) {
    return NextResponse.json(
      { error: existingError?.message || "Profile not found" },
      { status: 404 },
    );
  }

  let updatePayload: Record<string, unknown> | null = null;

  if (membership === "regular" || membership === "blackcard") {
    updatePayload =
      membership === "blackcard"
        ? {
            is_premium: true,
            premium_tier: "blackcard",
            premium_since: existingProfile.premium_since || new Date().toISOString(),
            premium_expires_at: existingProfile.premium_expires_at ?? null,
          }
        : {
            is_premium: false,
            premium_tier: null,
            premium_expires_at: null,
          };
  } else if (action === "grant") {
    updatePayload = {
      is_premium: true,
      premium_tier: "blackcard",
      premium_since: existingProfile.premium_since || new Date().toISOString(),
      premium_expires_at: expiresAt ?? null,
    };
  } else if (action === "revoke") {
    updatePayload = {
      is_premium: false,
      premium_tier: null,
      premium_expires_at: null,
    };
  } else if (action === "extend_30" || action === "extend_90") {
    const days = action === "extend_30" ? 30 : 90;
    updatePayload = {
      is_premium: true,
      premium_tier: "blackcard",
      premium_since: existingProfile.premium_since || new Date().toISOString(),
      premium_expires_at: resolveExpiration(existingProfile.premium_expires_at, days),
    };
  } else if (action === "set_expiration") {
    if (!expiresAt) {
      return NextResponse.json({ error: "expiresAt is required" }, { status: 400 });
    }

    updatePayload = {
      is_premium: true,
      premium_tier: "blackcard",
      premium_since: existingProfile.premium_since || new Date().toISOString(),
      premium_expires_at: expiresAt,
    };
  } else if (action === "grant_founding") {
    updatePayload = {
      is_founding_blackcard: true,
      founding_blackcard_granted_at: new Date().toISOString(),
      is_premium: true,
      premium_tier: "blackcard",
      premium_since: existingProfile.premium_since || new Date().toISOString(),
      premium_expires_at: null,
    };
  } else if (action === "revoke_founding") {
    updatePayload = {
      is_founding_blackcard: false,
      founding_blackcard_granted_at: null,
    };
  } else {
    return NextResponse.json({ error: "Invalid membership action" }, { status: 400 });
  }

  const { data: updatedProfile, error: updateError } = await adminClient
    .from("profiles")
    .update(updatePayload)
    .eq("id", profileId)
    .select(PROFILE_SELECT)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const blackcardPublic = await syncBlackcardPublicForUser(adminClient, profileId);

  const { data: subscription } = await adminClient
    .from("subscriptions")
    .select("status, plan_type, current_period_end, created_at")
    .eq("user_id", profileId)
    .order("current_period_end", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    profile: { ...updatedProfile, blackcard_public: blackcardPublic },
    subscription,
  });
}
