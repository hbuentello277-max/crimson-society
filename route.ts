import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase env vars" },
      { status: 500 }
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
