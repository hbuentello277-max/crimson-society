export const DM_QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "👀"] as const;

export type DmQuickReaction = (typeof DM_QUICK_REACTIONS)[number];

export type MessageReactionRow = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

export type ReactionChip = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export function isDmQuickReaction(value: string): value is DmQuickReaction {
  return (DM_QUICK_REACTIONS as readonly string[]).includes(value);
}

/** Group reactions by emoji with counts and current-user highlight. */
export function groupReactionsByEmoji(
  reactions: MessageReactionRow[],
  currentUserId: string,
  messageId?: string,
): ReactionChip[] {
  const scoped = messageId
    ? reactions.filter((reaction) => reaction.message_id === messageId)
    : reactions;

  const grouped = new Map<string, ReactionChip>();

  for (const reaction of scoped) {
    const existing = grouped.get(reaction.emoji) ?? {
      emoji: reaction.emoji,
      count: 0,
      reactedByMe: false,
    };

    existing.count += 1;
    if (reaction.user_id === currentUserId) {
      existing.reactedByMe = true;
    }

    grouped.set(reaction.emoji, existing);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.emoji.localeCompare(right.emoji);
  });
}

export function groupReactionsByMessageId(
  reactions: MessageReactionRow[],
  currentUserId: string,
): Record<string, ReactionChip[]> {
  const messageIds = Array.from(new Set(reactions.map((reaction) => reaction.message_id)));

  return Object.fromEntries(
    messageIds.map((messageId) => [
      messageId,
      groupReactionsByEmoji(reactions, currentUserId, messageId),
    ]),
  );
}

export type ReactionTogglePlan = {
  action: "add" | "remove";
  reactionId?: string;
};

/** Decide whether to add or remove the current user's reaction. */
export function planReactionToggle(
  reactions: MessageReactionRow[],
  messageId: string,
  userId: string,
  emoji: string,
): ReactionTogglePlan {
  const existing = reactions.find(
    (reaction) =>
      reaction.message_id === messageId &&
      reaction.user_id === userId &&
      reaction.emoji === emoji,
  );

  if (existing) {
    return { action: "remove", reactionId: existing.id };
  }

  const duplicate = reactions.some(
    (reaction) =>
      reaction.message_id === messageId &&
      reaction.user_id === userId &&
      reaction.emoji === emoji,
  );

  if (duplicate) {
    return { action: "remove" };
  }

  return { action: "add" };
}

/** Apply a toggle optimistically to the in-memory reaction list. */
export function applyReactionToggle(
  reactions: MessageReactionRow[],
  messageId: string,
  userId: string,
  emoji: string,
  reactionId?: string,
): MessageReactionRow[] {
  const plan = planReactionToggle(reactions, messageId, userId, emoji);

  if (plan.action === "remove") {
    const idToRemove =
      plan.reactionId ??
      reactions.find(
        (reaction) =>
          reaction.message_id === messageId &&
          reaction.user_id === userId &&
          reaction.emoji === emoji,
      )?.id;

    if (!idToRemove) {
      return reactions;
    }

    return reactions.filter((reaction) => reaction.id !== idToRemove);
  }

  const alreadyPresent = reactions.some(
    (reaction) =>
      reaction.message_id === messageId &&
      reaction.user_id === userId &&
      reaction.emoji === emoji,
  );

  if (alreadyPresent) {
    return reactions;
  }

  return [
    ...reactions,
    {
      id: reactionId ?? `optimistic-${messageId}-${userId}-${emoji}`,
      message_id: messageId,
      user_id: userId,
      emoji,
    },
  ];
}
