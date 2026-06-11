import assert from "node:assert/strict";
import test from "node:test";
import { loadNavBadgeCounts } from "@/lib/nav-badge-counts";

test("loadNavBadgeCounts maps RPC row fields", async () => {
  const supabase = {
    rpc: async () => ({
      data: [
        {
          unread_messages_count: 3,
          unread_notifications_count: 5,
          unread_meet_chat_count: 2,
          total_badge_count: 10,
        },
      ],
      error: null,
    }),
  };

  const counts = await loadNavBadgeCounts(supabase as never);
  assert.equal(counts.unreadMessagesCount, 3);
  assert.equal(counts.unreadNotificationsCount, 5);
  assert.equal(counts.unreadMeetChatCount, 2);
  assert.equal(counts.totalBadgeCount, 10);
});

test("loadNavBadgeCounts returns zeros on RPC error", async () => {
  const supabase = {
    rpc: async () => ({
      data: null,
      error: { message: "rpc failed" },
    }),
  };

  const counts = await loadNavBadgeCounts(supabase as never);
  assert.deepEqual(counts, {
    unreadMessagesCount: 0,
    unreadNotificationsCount: 0,
    unreadMeetChatCount: 0,
    totalBadgeCount: 0,
  });
});
