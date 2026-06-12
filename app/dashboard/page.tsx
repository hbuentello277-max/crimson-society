"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { DashboardFeedSection } from "@/components/dashboard/DashboardFeedSection";
import { DashboardMeetsSection } from "@/components/dashboard/DashboardMeetsSection";
import { DashboardModals } from "@/components/dashboard/DashboardModals";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ActiveSosFeedSection } from "@/components/rider-sos/ActiveSosFeedSection";
import { PushPermissionPrompt } from "@/components/push/PushPermissionPrompt";
import {
  DashboardFeedSkeleton,
  DashboardMeetsMapSkeleton,
} from "@/components/ui/skeletons";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/crimson-accent";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import { useAchievementMilestones } from "@/hooks/useAchievementMilestones";
import { useDashboardFeed } from "@/hooks/useDashboardFeed";
import { useDashboardMeets } from "@/hooks/useDashboardMeets";
import { useNearbyActiveSos } from "@/hooks/useNearbyActiveSos";
import { useRiderOnboardingChecklist } from "@/hooks/useRiderOnboardingChecklist";

const NewRiderChecklistCard = dynamic(
  () =>
    import("@/components/growth/NewRiderChecklistCard").then(
      (module) => module.NewRiderChecklistCard,
    ),
  { ssr: false },
);

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading, isAdmin } = useAuth();
  const userId = session?.user?.id ?? null;
  const {
    status: riderOnboardingStatus,
    loading: riderOnboardingLoading,
    awarding: riderOnboardingAwarding,
    completionNotice,
  } = useRiderOnboardingChecklist(Boolean(userId));
  useAchievementMilestones(userId, Boolean(userId));

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const feed = useDashboardFeed({
    session,
    isAdmin,
    deepLinkPostId: searchParams.get("post"),
    deepLinkCommentId: searchParams.get("comment"),
    onToast: showToast,
  });

  const nearbySos = useNearbyActiveSos(Boolean(userId));

  const meets = useDashboardMeets({
    session,
    isAdmin,
    router,
    onToast: (message) => {
      setToast(message);
      window.setTimeout(() => setToast(null), 2000);
    },
  });

  useEffect(() => {
    if (loading) return;

    if (!session?.user?.id) {
      router.replace("/login");
      return;
    }

    let active = true;

    const checkProfileSetup = async () => {
      try {
        const complete = await requireCompleteProfile(session.user.id);

        if (active && !complete) {
          router.replace("/profile/setup");
        }
      } catch {
        if (active) {
          router.replace("/profile/setup");
        }
      }
    };

    void checkProfileSetup();

    return () => {
      active = false;
    };
  }, [loading, session, router]);

  if (loading && !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">Opening...</p>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardShell
      visibleOffset={feed.visibleOffset}
      pullY={feed.pullY}
      pullProgress={feed.pullProgress}
      willRefresh={feed.willRefresh}
      refreshing={feed.refreshing}
      onTouchStart={feed.handleTouchStart}
      onTouchMove={feed.handleTouchMove}
      onTouchEnd={feed.handleTouchEnd}
      onMouseDown={feed.handleMouseDown}
      onMouseMove={feed.handleMouseMove}
      onMouseUp={feed.handleMouseUp}
      overlays={
        <>
          <DashboardModals
            session={session}
            commentSheet={feed.commentSheet}
            commentDraft={feed.commentDraft}
            shareSheet={feed.shareSheet}
            postActionTarget={feed.postActionTarget}
            reportPostTarget={feed.reportPostTarget}
            reportBusy={feed.reportBusy}
            posts={feed.posts}
            selectedMapMeet={meets.selectedMapMeet}
            going={meets.going}
            selectedMapMeetJoin={meets.selectedMapMeetJoin}
            onCloseCommentSheet={() => feed.setCommentSheet(null)}
            onCommentDraftChange={feed.setCommentDraft}
            onSendComment={() => void feed.sendComment()}
            onCloseShareSheet={() => feed.setShareSheet(null)}
            onShare={feed.handleShare}
            onClosePostActionTarget={() => feed.setPostActionTarget(null)}
            onReportPost={(target) => feed.setReportPostTarget(target)}
            onDeletePost={(post) => void feed.deletePost(post)}
            onHidePost={(postId) =>
              feed.setPosts((current) => current.filter((item) => item.id !== postId))
            }
            onToast={showToast}
            onCloseReportPost={() => {
              if (!feed.reportBusy) feed.setReportPostTarget(null);
            }}
            onReportBusyChange={feed.setReportBusy}
            onCloseReportPostTarget={() => feed.setReportPostTarget(null)}
            onCloseSelectedMapMeet={() => meets.setSelectedMapMeetId(null)}
            onJoinMapMeet={() => void meets.handleJoinMapMeet()}
            onLeaveMapMeet={() => void meets.handleLeaveMapMeet()}
          />

          {(toast || completionNotice) && (
            <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
              {completionNotice || toast}
            </div>
          )}

          <PushPermissionPrompt />
        </>
      }
    >
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <div className="mb-4">
          <NewRiderChecklistCard
            status={riderOnboardingStatus}
            loading={riderOnboardingLoading}
            awarding={riderOnboardingAwarding}
            compact
          />
        </div>

        <ActiveSosFeedSection
          alerts={nearbySos.alerts}
          loading={nearbySos.loading}
          error={nearbySos.error}
          locationNote={nearbySos.locationNote}
        />

        <DashboardMeetsSection
          dashboardLoading={meets.dashboardLoading}
          activeMapMeets={meets.activeMapMeets}
          upcomingMapMeets={meets.upcomingMapMeets}
          activeLiveRiderCount={meets.activeLiveRiderCount}
          liveMapPreview={meets.liveMapPreview}
          openMapHref={meets.openMapHref}
          previewMapCenter={meets.previewMapCenter}
          previewMapRiders={meets.previewMapRiders}
          previewFitPoints={meets.previewFitPoints}
          selectedMeetRoute={meets.selectedMeetRoute}
          dashboardUserLocation={meets.dashboardUserLocation}
          dashboardMapMarkers={meets.dashboardMapMarkers}
          selectedMapMeetId={meets.selectedMapMeetId}
          selectedMapMeet={meets.selectedMapMeet}
          mapRecenterSignal={meets.mapRecenterSignal}
          activeNowExpanded={meets.activeNowExpanded}
          onActiveNowExpandedChange={meets.setActiveNowExpanded}
          upcomingSoonExpanded={meets.upcomingSoonExpanded}
          onUpcomingSoonExpandedChange={meets.setUpcomingSoonExpanded}
          onMapRecenter={() => meets.setMapRecenterSignal((value) => value + 1)}
          onMeetMarkerSelect={meets.handleDashboardMeetMarkerSelect}
          onSelectMeet={meets.setSelectedMapMeetId}
        />

        <DashboardFeedSection
          feedLoading={feed.feedLoading}
          posts={feed.posts}
          liked={feed.liked}
          likeCounts={feed.likeCounts}
          bookmarked={feed.bookmarked}
          popId={feed.popId}
          highlightedPostId={feed.highlightedPostId}
          activeReelId={feed.activeReelId}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
          carouselRefs={feed.carouselRefs}
          postRefs={feed.postRefs}
          onToggleLike={(id) => void feed.toggleLike(id)}
          onOpenComments={feed.setCommentSheet}
          onOpenShare={feed.setShareSheet}
          onToggleBookmark={(id) => void feed.toggleBookmark(id)}
          onOpenPostActions={feed.setPostActionTarget}
          onActiveReelChange={feed.setActiveReelId}
        />
      </div>
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main
          className={`relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100 ${BOTTOM_NAV_CLEARANCE}`}
        >
          <div className="mx-auto max-w-2xl px-5 pt-6">
            <DashboardMeetsMapSkeleton />
            <div className="mt-7">
              <DashboardFeedSkeleton />
            </div>
          </div>
        </main>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
