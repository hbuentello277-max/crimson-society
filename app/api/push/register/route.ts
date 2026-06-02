import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function getUserIdFromRequest() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return null;
  }

  return user.id;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    token?: string;
    platform?: string;
    userAgent?: string | null;
  };

  if (!body.token?.trim()) {
    return NextResponse.json({ error: "Missing push token." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ push_notifications_enabled: true })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("user_push_tokens").upsert(
    {
      user_id: userId,
      token: body.token.trim(),
      platform: body.platform === "ios" || body.platform === "android" ? body.platform : "web",
      user_agent: body.userAgent || null,
      enabled: true,
      updated_at: now,
    },
    { onConflict: "user_id,token" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ push_notifications_enabled: false })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin
    .from("user_push_tokens")
    .update({ enabled: false, updated_at: now })
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
