import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPostCommentInsert,
  isMissingCommentTextColumnError,
} from "@/lib/dashboard/post-comment-insert";

describe("post comment insert", () => {
  it("builds insert payload with the migration body column by default", () => {
    assert.deepEqual(buildPostCommentInsert("post-1", "user-1", "Nice ride"), {
      post_id: "post-1",
      user_id: "user-1",
      body: "Nice ride",
    });
  });

  it("builds insert payload for alternate text columns", () => {
    assert.deepEqual(buildPostCommentInsert("post-1", "user-1", "Nice ride", "content"), {
      post_id: "post-1",
      user_id: "user-1",
      content: "Nice ride",
    });
  });

  it("detects schema cache column errors", () => {
    assert.equal(
      isMissingCommentTextColumnError(
        "Could not find the 'body' column of 'post_comments' in the schema cache",
        "body",
      ),
      true,
    );
    assert.equal(isMissingCommentTextColumnError("permission denied", "body"), false);
  });
});
