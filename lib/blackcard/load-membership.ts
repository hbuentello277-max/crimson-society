import { supabase } from "@/lib/supabase";
import type { MembershipRow } from "@/lib/membership";

export async function loadActiveMembership(
  userId?: string | null,
): Promise<MembershipRow | null> {
  let resolvedUserId = userId ?? null;

  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedUserId = user?.id ?? null;
  }

  if (!resolvedUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "status, plan_type, current_period_end, cancel_at_period_end, cancel_at, canceled_at, created_at",
    )
    .eq("user_id", resolvedUserId)
    .in("status", ["active", "trialing"])
    .or(
      `current_period_end.is.null,current_period_end.gte.${new Date().toISOString()}`,
    )
    .order("current_period_end", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MembershipRow | null) ?? null;
}
