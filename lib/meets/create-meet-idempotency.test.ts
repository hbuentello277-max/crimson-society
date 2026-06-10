import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMeetIdempotencyKey,
  isMeetCreateDuplicateError,
} from "@/lib/meets/create-meet-idempotency";

describe("createMeetIdempotencyKey", () => {
  it("returns a non-empty key", () => {
    const key = createMeetIdempotencyKey();
    assert.ok(key.length > 8);
  });
});

describe("isMeetCreateDuplicateError", () => {
  it("detects unique violations on create_idempotency_key", () => {
    assert.equal(
      isMeetCreateDuplicateError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "rides_host_create_idempotency_key_uidx"',
      }),
      true,
    );
    assert.equal(isMeetCreateDuplicateError({ code: "23505", message: "other constraint" }), false);
    assert.equal(isMeetCreateDuplicateError(null), false);
  });
});
