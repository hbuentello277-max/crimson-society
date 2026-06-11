import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Canonical column from migrations (20260529223000_add_post_likes_comments.sql).
 * Production may expose a different text column until migrations are applied.
 */
export const POST_COMMENT_TEXT_COLUMNS = ["body", "content", "comment_text", "text"] as const;

export type PostCommentTextColumn = (typeof POST_COMMENT_TEXT_COLUMNS)[number];

export const DEFAULT_POST_COMMENT_TEXT_COLUMN: PostCommentTextColumn = "body";

export function buildPostCommentInsert(
  postId: string,
  userId: string,
  text: string,
  column: PostCommentTextColumn = DEFAULT_POST_COMMENT_TEXT_COLUMN,
) {
  return {
    post_id: postId,
    user_id: userId,
    [column]: text,
  };
}

export function isMissingCommentTextColumnError(message: string | undefined, column: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes(`'${column}'`) &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("column"))
  );
}

export async function insertDashboardPostComment(
  client: SupabaseClient,
  postId: string,
  userId: string,
  text: string,
) {
  let lastError: { message?: string } | null = null;

  for (const column of POST_COMMENT_TEXT_COLUMNS) {
    const { error } = await client.from("post_comments").insert(
      buildPostCommentInsert(postId, userId, text, column),
    );

    if (!error) {
      return { error: null, column };
    }

    lastError = error;
    if (!isMissingCommentTextColumnError(error.message, column)) {
      return { error, column };
    }
  }

  return { error: lastError, column: null };
}
