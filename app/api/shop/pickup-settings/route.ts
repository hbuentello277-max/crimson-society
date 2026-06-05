import { NextResponse } from "next/server";
import { loadLocalPickupSettings } from "@/lib/shop/shop-settings-db";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const settings = await loadLocalPickupSettings(supabase);
  return NextResponse.json({ settings });
}
