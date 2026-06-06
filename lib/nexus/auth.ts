import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { NexusAccessResult, NexusOwner, NexusSession } from "@/lib/nexus/types";

const OWNER_PROFILE_SELECT = "role, status, is_platform_owner";

type OwnerProfileRow = {
  role: string | null;
  status: string | null;
  is_platform_owner: boolean | null;
};

export function isOwnerFromProfile(profile: {
  status?: string | null;
  is_platform_owner?: boolean | null;
} | null): boolean {
  return profile?.status === "active" && profile?.is_platform_owner === true;
}

/** Authoritative owner check — matches RLS helper (column + allowlist). */
export async function isOwner(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_owner", {
    target_user_id: userId,
  });

  if (error) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(OWNER_PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    return isOwnerFromProfile(profile as OwnerProfileRow | null);
  }

  return data === true;
}

function buildOwner(
  userId: string,
  email: string | null,
  profile: OwnerProfileRow | null,
): NexusOwner {
  return {
    userId,
    email,
    role: profile?.role ?? null,
    status: profile?.status ?? null,
    isPlatformOwner: profile?.is_platform_owner === true,
  };
}

export async function getOwnerSession(): Promise<NexusAccessResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(OWNER_PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  const ownerAccess = await isOwner(supabase, user.id);
  if (!ownerAccess) {
    return { ok: false, reason: "forbidden" };
  }

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email ?? null,
      supabase,
      owner: buildOwner(user.id, user.email ?? null, profile as OwnerProfileRow | null),
    },
  };
}

export async function requireOwnerSession():
  Promise<{ session: NexusSession } | { error: NextResponse }> {
  const result = await getOwnerSession();

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session: result.session };
}
