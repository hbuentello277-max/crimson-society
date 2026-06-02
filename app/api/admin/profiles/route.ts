import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";

const PROFILE_COLUMNS =
  "id, username, email, display_name, role, status, is_premium, premium_tier, premium_since, premium_expires_at, created_at";

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const adminClient = createAdminServiceClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profiles.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
