export type MessageBadgeRow = {
  conversation_id: string;
  sender_id: string;
  created_at: string;
};

export type ConversationMemberBadgeRow = {
  conversation_id: string;
  last_read_at: string | null;
};

export function blockedUserIdSet(
  userId: string,
  blocks: Array<{ blocker_id: string; blocked_id: string }>,
) {
  return new Set(
    blocks.map((block) => (block.blocker_id === userId ? block.blocked_id : block.blocker_id)),
  );
}

export function countUnreadMessages(
  userId: string,
  memberRows: ConversationMemberBadgeRow[],
  messages: MessageBadgeRow[],
  blockedUserIds: Set<string> = new Set(),
) {
  const readMap = new Map(
    memberRows.map((membership) => [membership.conversation_id, membership.last_read_at]),
  );

  return messages.reduce((total, message) => {
    if (message.sender_id === userId) {
      return total;
    }

    if (blockedUserIds.has(message.sender_id)) {
      return total;
    }

    const lastReadAt = readMap.get(message.conversation_id);
    if (!lastReadAt || message.created_at > lastReadAt) {
      return total + 1;
    }

    return total;
  }, 0);
}
