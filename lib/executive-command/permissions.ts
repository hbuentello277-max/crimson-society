import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-api";
import { isOwner } from "@/lib/nexus/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { ExecutiveAccess } from "@/lib/executive-command/types";

export type ExecutiveCommandSession = {
  userId: string;
  supabase: SupabaseClient;
  access: ExecutiveAccess;
};

export async function requireExecutiveCommandReader(): Promise<
  { session: ExecutiveCommandSession } | { error: NextResponse }
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
