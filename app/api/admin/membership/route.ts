import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MembershipTier = "regular" | "blackcard";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase env vars" },
      { status: 500 },
    );
  }

  const { profileId, membership } = (await req.json()) as {
    profileId?: string;
    membership?: MembershipTier;
  };

  if (!profileId || !membership) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 },
    );
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  const isBlackcard = membership === "blackcard";
  const now = new Date().toISOString();

  const { data, error } = await adminSupabase
    .from("profiles")
    .update({
      is_premium: isBlackcard,
      premium_tier: isBlackcard ? "blackcard" : null,
      premium_since: isBlackcard ? now : null,
      premium_expires_at: null,
    })
    .eq("id", profileId)
    .select(
      "id, username, email, display_name, role, status, is_premium, premium_tier, premium_since, premium_expires_at, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Membership update failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: data });
}