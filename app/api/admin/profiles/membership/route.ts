import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getMissingSupabaseAdminEnvVars,
  getSupabaseProjectUrl,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase-admin-env";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (me?.role !== "admin" || me?.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceKey = getSupabaseServiceRoleKey();
  const supabaseUrl = getSupabaseProjectUrl();

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: `Missing Supabase env var(s): ${getMissingSupabaseAdminEnvVars().join(", ")}` },
      { status: 500 },
    );
  }

  let body: { profileId?: string; membership?: "regular" | "blackcard" };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { profileId, membership } = body;

  if (!profileId || (membership !== "regular" && membership !== "blackcard")) {
    return NextResponse.json({ error: "Invalid membership payload" }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingProfile, error: existingError } = await adminClient
    .from("profiles")
    .select("id, username, email, display_name, role, status, created_at, is_premium, premium_tier, premium_since, premium_expires_at")
    .eq("id", profileId)
    .single();

  if (existingError || !existingProfile) {
    return NextResponse.json(
      { error: existingError?.message || "Profile not found" },
      { status: 404 },
    );
  }

  const updatePayload =
    membership === "blackcard"
      ? {
          is_premium: true,
          premium_tier: "blackcard",
          premium_since: existingProfile.premium_since || new Date().toISOString(),
        }
      : {
          is_premium: false,
          premium_tier: null,
          premium_expires_at: null,
        };

  const { data: updatedProfile, error: updateError } = await adminClient
    .from("profiles")
    .update(updatePayload)
    .eq("id", profileId)
    .select("id, username, email, display_name, role, status, created_at, is_premium, premium_tier, premium_since, premium_expires_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ profile: updatedProfile });
}
