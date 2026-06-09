import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dispatchDueMeetReminders } from "@/lib/meets/meet-reminders";
import { isPushDispatchAuthorized } from "@/lib/push/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials for meet reminders.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function runMeetReminders(request: Request) {
  if (!isPushDispatchAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const result = await dispatchDueMeetReminders(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meet reminder cron failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return runMeetReminders(request);
}

export async function POST(request: Request) {
  return runMeetReminders(request);
}
