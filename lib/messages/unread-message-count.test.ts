import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockedUserIdSet,
  countUnreadMessages,
  type ConversationMemberBadgeRow,
  type MessageBadgeRow,
} from "@/lib/messages/unread-message-count";

describe("countUnreadMessages", () => {
  const userId = "user-1";
  const memberships: ConversationMemberBadgeRow[] = [
    { conversation_id: "conv-1", last_read_at: "2026-06-06T10:00:00.000Z" },
  ];

  it("ignores self-sent and already-read messages", () => {
    const messages: MessageBadgeRow[] = [
      {
        conversation_id: "conv-1",
        sender_id: userId,
        created_at: "2026-06-06T10:05:00.000Z",
      },
      {
        conversation_id: "conv-1",
        sender_id: "user-2",
        created_at: "2026-06-06T09:00:00.000Z",
      },
    ];

    assert.equal(countUnreadMessages(userId, memberships, messages), 0);
  });

  it("counts unread messages from other users", () => {
    const messages: MessageBadgeRow[] = [
      {
        conversation_id: "conv-1",
        sender_id: "user-2",
        created_at: "2026-06-06T10:05:00.000Z",
      },
    ];

    assert.equal(countUnreadMessages(userId, memberships, messages), 1);
  });

  it("excludes messages from blocked users", () => {
    const messages: MessageBadgeRow[] = [
      {
        conversation_id: "conv-1",
        sender_id: "user-2",
        created_at: "2026-06-06T10:05:00.000Z",
      },
    ];

    const blocked = blockedUserIdSet(userId, [{ blocker_id: userId, blocked_id: "user-2" }]);
    assert.equal(countUnreadMessages(userId, memberships, messages, blocked), 0);
  });
});
