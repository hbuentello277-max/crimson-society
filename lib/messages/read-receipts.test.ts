import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  incomingUndeliveredMessageIds,
  latestOutgoingMessageId,
  resolveReadReceiptState,
  shouldShowReadReceipt,
} from "@/lib/messages/read-receipts";

const outgoingMessages = [
  {
    id: "m-1",
    createdAt: "2026-06-09T10:00:00.000Z",
    deliveredAt: "2026-06-09T10:00:05.000Z",
    senderId: "me",
  },
  {
    id: "m-2",
    createdAt: "2026-06-09T11:00:00.000Z",
    deliveredAt: null,
    senderId: "me",
  },
  {
    id: "m-3",
    createdAt: "2026-06-09T12:00:00.000Z",
    deliveredAt: null,
    senderId: "peer",
  },
];

describe("latestOutgoingMessageId", () => {
  it("returns only the latest outgoing message", () => {
    assert.equal(latestOutgoingMessageId(outgoingMessages, "me"), "m-2");
  });
});

describe("resolveReadReceiptState", () => {
  it("returns sent when only stored on backend", () => {
    assert.equal(
      resolveReadReceiptState(
        { createdAt: "2026-06-09T11:00:00.000Z", deliveredAt: null },
        null,
      ),
      "sent",
    );
  });

  it("returns delivered when synced to recipient stream", () => {
    assert.equal(
      resolveReadReceiptState(
        {
          createdAt: "2026-06-09T11:00:00.000Z",
          deliveredAt: "2026-06-09T11:00:02.000Z",
        },
        null,
      ),
      "delivered",
    );
  });

  it("returns seen when peer last_read_at covers the message", () => {
    assert.equal(
      resolveReadReceiptState(
        {
          createdAt: "2026-06-09T11:00:00.000Z",
          deliveredAt: "2026-06-09T11:00:02.000Z",
        },
        "2026-06-09T11:05:00.000Z",
      ),
      "seen",
    );
  });
});

describe("shouldShowReadReceipt", () => {
  it("shows receipt only on latest outgoing message from current user", () => {
    const latestId = latestOutgoingMessageId(outgoingMessages, "me");

    assert.equal(
      shouldShowReadReceipt({
        messageId: "m-2",
        latestOutgoingMessageId: latestId,
        isFromCurrentUser: true,
        peerIsBlocked: false,
      }),
      true,
    );

    assert.equal(
      shouldShowReadReceipt({
        messageId: "m-1",
        latestOutgoingMessageId: latestId,
        isFromCurrentUser: true,
        peerIsBlocked: false,
      }),
      false,
    );
  });

  it("hides receipts for blocked peers", () => {
    assert.equal(
      shouldShowReadReceipt({
        messageId: "m-2",
        latestOutgoingMessageId: "m-2",
        isFromCurrentUser: true,
        peerIsBlocked: true,
      }),
      false,
    );
  });
});

describe("incomingUndeliveredMessageIds", () => {
  it("returns only incoming messages missing delivered_at", () => {
    assert.deepEqual(
      incomingUndeliveredMessageIds(
        [
          { id: "a", sender_id: "peer", delivered_at: null },
          { id: "b", sender_id: "me", delivered_at: null },
          { id: "c", sender_id: "peer", delivered_at: "2026-06-09T10:00:00.000Z" },
        ],
        "me",
      ),
      ["a"],
    );
  });
});
