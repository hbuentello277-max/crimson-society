import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";

const REMOVED_PROFILE_COLUMNS =
  "id, username, email, display_name, role, status, is_premium, premium_tier, premium_since, premium_expires_at, created_at, is_founding_blackcard, founding_blackcard_granted_at, membership_tier, blackcard_public";

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { profileId?: string; confirmation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const profileId = body.profileId?.trim();
  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  if (profileId === auth.session.userId) {
    return NextResponse.json(
      { error: "You cannot remove your own admin account." },
      { status: 400 },
    );
  }

  if (body.confirmation !== "REMOVE_PROFILE") {
    return NextResponse.json(
      { error: "Removal confirmation is required." },
      { status: 400 },
    );
  }

  const admin = createAdminServiceClient();

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role, is_admin, status")
    .eq("id", profileId)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (target.is_admin === true || target.role === "admin") {
    return NextResponse.json(
      { error: "Admin and owner profiles cannot be removed with this action." },
      { status: 400 },
    );
  }

  const removedUsername = `removed_${profileId.slice(0, 8)}_${Date.now().toString(36)}`;

  const { data, error } = await admin
    .from("profiles")
    .update({
      role: "user",
      status: "deleted",
      username: removedUsername,
      display_name: "Removed Member",
      full_name: null,
      bio: null,
      quote: null,
      avatar_url: null,
      profile_image_url: null,
      location: null,
      city: null,
      state: null,
      riding_area: null,
      instagram_url: null,
      tiktok_url: null,
      youtube_url: null,
      website_url: null,
      hide_from_suggestions: true,
      hide_location_from_suggestions: true,
      is_premium: false,
      premium_tier: null,
      premium_expires_at: null,
      membership_status: "inactive",
      membership_tier: null,
      blackcard_public: false,
    })
    .eq("id", profileId)
    .select(REMOVED_PROFILE_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data });
}
