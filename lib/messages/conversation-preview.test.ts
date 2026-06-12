import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchDirectConversationPreview } from "@/lib/messages/conversation-preview";

function createSupabaseStub(conversation: Record<string, unknown>, members: Array<{ user_id: string }>) {
  return {
    from(table: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          if (table === "conversations") {
            return { data: conversation, error: null };
          }
          if (table === "public_profiles") {
            return { data: null, error: null };
          }
          return { data: null, error: null };
        },
        then(resolve: (value: { data: unknown; error: null }) => void) {
          if (table === "conversation_members") {
            resolve({ data: members, error: null });
            return;
          }
          resolve({ data: null, error: null });
        },
      };
    },
  };
}

describe("fetchDirectConversationPreview", () => {
  it("previews SOS conversations without requiring another profile", async () => {
    const preview = await fetchDirectConversationPreview(
      createSupabaseStub(
        {
          id: "conversation-1",
          conversation_type: "sos",
          title: "🚨 SOS Assistance Chat",
          conversation_status: "archived",
          sos_type: "mechanical",
          sos_owner_name: "Hector",
          sos_active_responder_count: 2,
          updated_at: "2026-06-12T12:00:00.000Z",
        },
        [{ user_id: "owner-1" }],
      ) as never,
      "conversation-1",
      "owner-1",
    );

    assert.equal(preview?.name, "🚨 SOS Assistance Chat");
    assert.equal(preview?.handle, "Mechanical Issue · Hector · 2 Responders Active");
    assert.equal(preview?.isGroup, true);
    assert.equal(preview?.isSos, true);
    assert.equal(preview?.conversationStatus, "archived");
  });
});

