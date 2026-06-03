import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { assertSupabaseAdminEnv } from "@/lib/supabase-admin-env";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type AdminSession = {
  userId: string;
  supabase: SupabaseClient;
};

export async function requireAdminSession():
  Promise<{ session: AdminSession } | { error: NextResponse }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isActiveAdmin =
    profile?.status === "active" &&
    (profile.role === "admin" || profile.is_admin === true);

  if (!isActiveAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session: { userId: user.id, supabase } };
}

export function createAdminServiceClient() {
  const { url, serviceRoleKey } = assertSupabaseAdminEnv();

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
