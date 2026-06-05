import type { SupabaseClient } from "@supabase/supabase-js";

/** Active admin/owner profile ids (role=admin or is_admin flag). */
export async function loadActiveAdminUserIds(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, is_admin, status")
    .eq("status", "active");

  if (error) {
    console.warn("[admin-users] load failed", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.is_admin === true || row.role === "admin")
    .map((row) => row.id as string)
    .filter(Boolean);
}
