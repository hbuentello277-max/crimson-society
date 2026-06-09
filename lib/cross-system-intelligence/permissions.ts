import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-api";
import { isOwner } from "@/lib/nexus/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { CrossSystemAccess } from "@/lib/cross-system-intelligence/types";

export type CrossSystemIntelligenceSession = {
  userId: string;
  supabase: SupabaseClient;
  access: CrossSystemAccess;
};

export async function requireCrossSystemIntelligenceReader(): Promise<
  { session: CrossSystemIntelligenceSession } | { error: NextResponse }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (await isOwner(supabase, user.id)) {
    return {
      session: {
        userId: user.id,
        supabase,
        access: "owner",
      },
    };
  }

  const admin = await requireAdminSession();
  if ("error" in admin) {
    return admin;
  }

  return {
    session: {
      userId: admin.session.userId,
      supabase: admin.session.supabase,
      access: "admin",
    },
  };
}
