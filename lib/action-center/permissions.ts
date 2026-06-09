import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-api";
import { isOwner } from "@/lib/nexus/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { NexusActionCategory, NexusActionType } from "@/lib/action-center/types";
import { isOperationalActionType } from "@/lib/action-center/constants";

export type NexusActionAccess = "owner" | "admin";

export type NexusActionSession = {
  userId: string;
  supabase: SupabaseClient;
  access: NexusActionAccess;
};

export async function requireNexusActionReader(): Promise<
  { session: NexusActionSession } | { error: NextResponse }
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

export async function requireNexusActionOwner(): Promise<
  { session: NexusActionSession } | { error: NextResponse }
> {
  const auth = await requireNexusActionReader();
  if ("error" in auth) {
    return auth;
  }

  if (auth.session.access !== "owner") {
    return { error: NextResponse.json({ error: "Platform owner access required." }, { status: 403 }) };
  }

  return auth;
}

export function canReadActionCategory(
  access: NexusActionAccess,
  category: NexusActionCategory,
): boolean {
  if (access === "owner") {
    return true;
  }
  return category === "operational";
}

export function canMutateAction(
  access: NexusActionAccess,
  actionType: NexusActionType,
): boolean {
  return access === "owner";
}

export function canReadActionType(access: NexusActionAccess, actionType: NexusActionType): boolean {
  if (access === "owner") {
    return true;
  }
  return isOperationalActionType(actionType);
}
