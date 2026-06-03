import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMissingSupabaseAdminEnvVars, getSupabaseProjectUrl, getSupabaseServiceRoleKey } from "@/lib/supabase-admin-env";

export async function POST(req: Request) {
  const supabaseUrl = getSupabaseProjectUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: `Missing Supabase env var(s): ${getMissingSupabaseAdminEnvVars().join(", ")}` },
      { status: 500 },
    );
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  const { userId, planType } = await req.json();

  if (!userId || !planType) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const nextPlanType = planType === "blackcard" ? "blackcard" : "member";

  const { error } = await adminSupabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        status: "active",
        plan_type: nextPlanType,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not update membership." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
