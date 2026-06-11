"use client";

import dynamic from "next/dynamic";
import type { Session } from "@supabase/supabase-js";
import type { PostActionTarget } from "@/components/social/PostActionSheet";
import { DEFAULT_REPORT_REASONS, submitUserReport } from "@/lib/user-reports";
import { isMeetHostOrCoHost } from "@/lib/meets/permissions";
import type { DashboardFeedPost } from "@/lib/dashboard/types";
import type { DashboardMapMeet } from "@/lib/meets/dashboard-map";

const ReportContentModal = dynamic(
  () => import("@/components/safety/ReportContentModal").then((module) => module.ReportContentModal),
  { ssr: false },
);

const PostActionSheet = dynamic(
  () => import("@/components/social/PostActionSheet").then((module) => module.PostActionSheet),
  { ssr: false },
);

const DashboardMeetMapSheet = dynamic(
  () =>
    import("@/components/meets/dashboard/DashboardMeetMapSheet").then(
      (module) => module.DashboardMeetMapSheet,
    ),
  { ssr: false },
);

type DashboardModalsProps = {
  session: Session | null;
  commentSheet: string | null;
  commentDraft: string;
  shareSheet: string | null;
  postActionTarget: PostActionTarget | null;
  reportPostTarget: {
    postId: string;
    authorId: string;
    authorName: string;
  } | null;
  reportBusy: boolean;
  posts: DashboardFeedPost[];
  selectedMapMeet: DashboardMapMeet | null;
  going: Record<string, boolean>;
  selectedMapMeetJoin: { allowed: boolean; message: string | null };
  onCloseCommentSheet: () => void;
  onCommentDraftChange: (value: string) => void;
  onSendComment: () => void;
  onCloseShareSheet: () => void;
  onShare: (action: string) => void;
  onClosePostActionTarget: () => void;
  onReportPost: (target: { postId: string; authorId: string; authorName: string }) => void;
  onDeletePost: (post: DashboardFeedPost) => void;
  onHidePost: (postId: string) => void;
  onToast: (message: string) => void;
  onCloseReportPost: () => void;
  onReportBusyChange: (busy: boolean) => void;
  onCloseReportPostTarget: () => void;
  onCloseSelectedMapMeet: () => void;
  onJoinMapMeet: () => void;
  onLeaveMapMeet: () => void;
};

export function DashboardModals({
  session,
  commentSheet,
  commentDraft,
  shareSheet,
  postActionTarget,
  reportPostTarget,
  reportBusy,
  posts,
  selectedMapMeet,
  going,
  selectedMapMeetJoin,
  onCloseCommentSheet,
  onCommentDraftChange,
  onSendComment,
  onCloseShareSheet,
  onShare,
  onClosePostActionTarget,
  onReportPost,
  onDeletePost,
  onHidePost,
  onToast,
  onCloseReportPost,
  onReportBusyChange,
  onCloseReportPostTarget,
  onCloseSelectedMapMeet,
  onJoinMapMeet,
  onLeaveMapMeet,
}: DashboardModalsProps) {
  return (
    <>
      {commentSheet ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onCloseCommentSheet}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-[#0a0a0b] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Reply</p>
                <h2 className="font-serif text-2xl italic text-white">Comments</h2>
              </div>
              <button
                onClick={onCloseCommentSheet}
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/70 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="mb-4 space-y-3 text-sm text-white/60">
              <p>No comments yet. Be the first to weigh in.</p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2">
              <input
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSendComment()}
                placeholder="Say something..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              <button
                onClick={onSendComment}
                className="rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#e87a82] transition hover:bg-[#b4141e]/30"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shareSheet ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onCloseShareSheet}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-[#0a0a0b] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Send to</p>
              <h2 className="font-serif text-2xl italic text-white">Share</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onShare("Copied link.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">Copy Link</p>
                <p className="mt-1 text-[10px] text-white/40">crimsonsociety.app/...</p>
              </button>

              <button
                onClick={() => onShare("Added to story.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">Add to Story</p>
                <p className="mt-1 text-[10px] text-white/40">Visible 24h</p>
              </button>

              <button
                onClick={() => onShare("Reposted.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">Repost</p>
                <p className="mt-1 text-[10px] text-white/40">To your feed</p>
              </button>

              <button
                onClick={() => onShare("Sent in DM.")}
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-[#b4141e]/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">Send DM</p>
                <p className="mt-1 text-[10px] text-white/40">Pick a rider</p>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reportPostTarget ? (
        <ReportContentModal
          open
          title="Report Post"
          subtitle={
            reportPostTarget
              ? `Report ${reportPostTarget.authorName}'s post for moderator review.`
              : undefined
          }
          reasons={DEFAULT_REPORT_REASONS}
          busy={reportBusy}
          onClose={onCloseReportPost}
          onSubmit={async ({ reason, details }) => {
            if (!session?.user?.id || !reportPostTarget) return;
            onReportBusyChange(true);
            const { error } = await submitUserReport({
              reporterId: session.user.id,
              reason,
              details,
              postId: reportPostTarget.postId,
              reportedUserId: reportPostTarget.authorId,
            });
            onReportBusyChange(false);
            if (error) {
              onToast(error.message);
              return;
            }
            onCloseReportPostTarget();
            onToast("Post report submitted.");
          }}
        />
      ) : null}

      {postActionTarget ? (
        <PostActionSheet
          open
          target={postActionTarget}
          onClose={onClosePostActionTarget}
          onReport={() => {
            if (!postActionTarget) return;
            onReportPost({
              postId: postActionTarget.postId,
              authorId: postActionTarget.authorId,
              authorName: postActionTarget.authorName,
            });
          }}
          onDelete={() => {
            if (!postActionTarget) return;
            const post = posts.find((item) => item.id === postActionTarget.postId);
            if (post) void onDeletePost(post);
          }}
          onHidden={onHidePost}
          onToast={(message) => onToast(message)}
        />
      ) : null}

      {selectedMapMeet ? (
        <DashboardMeetMapSheet
          meet={selectedMapMeet}
          open
          isGoing={!!going[selectedMapMeet.id]}
          isHostTeam={isMeetHostOrCoHost(
            { hostId: selectedMapMeet.hostId, coHostId: selectedMapMeet.coHostId },
            session?.user?.id,
          )}
          canJoin={selectedMapMeetJoin.allowed}
          joinBlockedMessage={selectedMapMeetJoin.message}
          onClose={onCloseSelectedMapMeet}
          onJoin={onJoinMapMeet}
          onLeave={onLeaveMapMeet}
        />
      ) : null}
    </>
  );
}
