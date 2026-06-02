import { supabase } from "@/lib/supabase";

export type BlockState = {
  blockedByMe: Set<string>;
  blockingMe: Set<string>;
};

export function getBlockedUserIds(state: BlockState) {
  return new Set([...state.blockedByMe, ...state.blockingMe]);
}

export function isInteractionBlocked(
  viewerId: string | null | undefined,
  targetId: string | null | undefined,
  state: BlockState,
) {
  if (!viewerId || !targetId || viewerId === targetId) {
    return false;
  }

  return state.blockedByMe.has(targetId) || state.blockingMe.has(targetId);
}

export async function fetchBlockState(userId: string): Promise<BlockState> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  if (error) {
    throw error;
  }

  const blockedByMe = new Set<string>();
  const blockingMe = new Set<string>();

  for (const row of data ?? []) {
    if (row.blocker_id === userId) {
      blockedByMe.add(row.blocked_id);
    }
    if (row.blocked_id === userId) {
      blockingMe.add(row.blocker_id);
    }
  }

  return { blockedByMe, blockingMe };
}

export async function removeMutualFollows(userId: string, otherUserId: string) {
  await Promise.all([
    supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", otherUserId),
    supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", otherUserId)
      .eq("following_id", userId),
  ]);
}

export async function isBlockedWithHost(userId: string, hostId: string | null | undefined) {
  if (!hostId || hostId === userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${hostId}),and(blocker_id.eq.${hostId},blocked_id.eq.${userId})`,
    )
    .limit(1);

  if (error) {
    throw error;
  }

  return (data ?? []).length > 0;
}
