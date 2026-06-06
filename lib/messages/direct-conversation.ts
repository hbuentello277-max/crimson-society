import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function directKeyFor(a: string, b: string) {
  return [a, b].sort().join(":");
}

export type OpenDirectConversationResult =
  | { ok: true; conversationId: string; created: boolean }
  | { ok: false; error: string };

async function usersAreBlocked(
  supabase: SupabaseClient,
  userId: string,
  peerId: string,
) {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id")
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${peerId}),and(blocker_id.eq.${peerId},blocked_id.eq.${userId})`)
    .limit(1);

  if (error) {
    return { blocked: false as const, error: error.message };
  }

  return { blocked: (data || []).length > 0, error: null as string | null };
}

async function ensureProfileIdsExist(
  supabase: SupabaseClient,
  userId: string,
  peerId: string,
) {
  const [ownProfile, peerProfile] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", userId).maybeSingle(),
    supabase.from("public_profiles").select("id").eq("id", peerId).maybeSingle(),
  ]);

  if (ownProfile.error || peerProfile.error) {
    return {
      ok: false as const,
      error: ownProfile.error?.message || peerProfile.error?.message || "Could not verify riders.",
    };
  }

  if (!ownProfile.data?.id) {
    return {
      ok: false as const,
      error: "Complete your profile setup before starting a message.",
    };
  }

  if (!peerProfile.data?.id) {
    return {
      ok: false as const,
      error: "This rider does not have a messaging profile yet.",
    };
  }

  return { ok: true as const, error: null };
}

/**
 * Opens or creates a direct conversation between two profile IDs (auth user IDs).
 * Both users must have rows in public.profiles (conversation_members FK target).
 */
export async function openDirectConversationWithPeer(
  supabase: SupabaseClient,
  userId: string,
  peerId: string,
): Promise<OpenDirectConversationResult> {
  if (!isUuid(userId) || !isUuid(peerId)) {
    return { ok: false, error: "Invalid rider." };
  }

  if (peerId === userId) {
    return { ok: false, error: "You cannot message yourself." };
  }

  const profileCheck = await ensureProfileIdsExist(supabase, userId, peerId);
  if (!profileCheck.ok) {
    return { ok: false, error: profileCheck.error };
  }

  const blockCheck = await usersAreBlocked(supabase, userId, peerId);
  if (blockCheck.error) {
    return { ok: false, error: blockCheck.error };
  }

  if (blockCheck.blocked) {
    return {
      ok: false,
      error: "Messaging is unavailable because one of you has blocked the other.",
    };
  }

  const directKey = directKeyFor(userId, peerId);
  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("direct_key", directKey)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: existing.error.message };
  }

  if (existing.data?.id) {
    return { ok: true, conversationId: existing.data.id as string, created: false };
  }

  const created = await supabase
    .from("conversations")
    .insert({
      conversation_type: "direct",
      direct_key: directKey,
      created_by: userId,
    })
    .select("id")
    .single();

  if (created.error || !created.data?.id) {
    return { ok: false, error: created.error?.message || "Could not open conversation." };
  }

  const conversationId = created.data.id as string;

  const membersResponse = await supabase.from("conversation_members").insert([
    {
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    },
    { conversation_id: conversationId, user_id: peerId },
  ]);

  if (membersResponse.error) {
    await supabase.from("conversations").delete().eq("id", conversationId);
    return {
      ok: false,
      error:
        membersResponse.error.message.includes("foreign key")
          ? `${membersResponse.error.message} Ensure both riders have profile rows (profiles.id).`
          : membersResponse.error.message,
    };
  }

  return { ok: true, conversationId, created: true };
}
