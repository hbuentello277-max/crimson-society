import { NextResponse } from "next/server";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export async function POST(request: Request) {
  try {
    const auth = await getAuthedSupabaseFromRequest(request);
    if (!("userId" in auth) || !auth.userId || !auth.supabase) {
      const message = "error" in auth ? auth.error : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const { supabase, userId } = auth;

    let body: { token?: string; platform?: string; userAgent?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.token?.trim()) {
      return NextResponse.json({ error: "Missing push token." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const platform =
      body.platform === "ios" || body.platform === "android" || body.platform === "web"
        ? body.platform
        : "web";

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ push_notifications_enabled: true })
      .eq("id", userId);

    if (profileError) {
      console.error("[push/register] profile update failed:", profileError.message);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { error: tokenError } = await supabase.from("user_push_tokens").upsert(
      {
        user_id: userId,
        token: body.token.trim(),
        platform,
        user_agent: body.userAgent || null,
        enabled: true,
        updated_at: now,
      },
      { onConflict: "user_id,token" },
    );

    if (tokenError) {
      console.error("[push/register] token upsert failed:", tokenError.message);
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register push token.";
    console.error("[push/register] unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthedSupabaseFromRequest(request);
    if (!("userId" in auth) || !auth.userId || !auth.supabase) {
      const message = "error" in auth ? auth.error : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const { supabase, userId } = auth;
    const now = new Date().toISOString();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ push_notifications_enabled: false })
      .eq("id", userId);

    if (profileError) {
      console.error("[push/register] profile disable failed:", profileError.message);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { error: tokenError } = await supabase
      .from("user_push_tokens")
      .update({ enabled: false, updated_at: now })
      .eq("user_id", userId);

    if (tokenError) {
      console.error("[push/register] token disable failed:", tokenError.message);
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disable push token.";
    console.error("[push/register] unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
