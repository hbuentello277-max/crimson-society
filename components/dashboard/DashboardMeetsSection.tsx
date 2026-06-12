"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { NavigateToMeetButton } from "@/components/meets/NavigateToMeetButton";
import {
  dashboardMeetToStartRideInput,
  StartRideLink,
} from "@/components/meets/StartRideLink";
import {
  DashboardMeetCardSkeleton,
  DashboardMeetsMapSkeleton,
} from "@/components/ui/skeletons";
import { MapLoadingPlaceholder } from "@/components/ui/MapLoadingPlaceholder";
import { formatDashboardMeetTime } from "@/lib/dashboard/time";
import {
  dashboardMeetHasRoute,
  dashboardMeetLifecycleLabel,
  type DashboardMapMeet,
} from "@/lib/meets/dashboard-map";
import { hasMapsNavigationTarget } from "@/lib/meets/maps-links";
import { meetDetailHref } from "@/lib/navigation/meets-return";
import type { DashboardLiveMapPreview, DashboardRoutePoint } from "@/lib/dashboard/types";

const MeetMap = dynamic(() => import("@/components/MeetMap"), {
  ssr: false,
  loading: () => <MapLoadingPlaceholder className="h-56 w-full" />,
});

type PreviewMapRider = {
  user_id: string;
  rider_name: string;
  rider_username: string | null;
  rider_display_name: string;
  rider_photo: string | null;
  lat: number;
  lng: number;
  profile_href: string | null;
};

type DashboardMeetsSectionProps = {
  dashboardLoading: boolean;
  activeMapMeets: DashboardMapMeet[];
  upcomingMapMeets: DashboardMapMeet[];
  activeLiveRiderCount: number;
  liveMapPreview: DashboardLiveMapPreview;
  openMapHref: string;
  previewMapCenter: DashboardRoutePoint;
  previewMapRiders: PreviewMapRider[];
  previewFitPoints: DashboardRoutePoint[];
  selectedMeetRoute: DashboardRoutePoint[];
  dashboardUserLocation: DashboardRoutePoint | null;
  dashboardMapMarkers: ReturnType<typeof import("@/lib/meets/dashboard-map").buildDashboardMapMarkers>;
  selectedMapMeetId: string | null;
  selectedMapMeet: DashboardMapMeet | null;
  mapRecenterSignal: number;
  activeNowExpanded: boolean;
  onActiveNowExpandedChange: (expanded: boolean) => void;
  upcomingSoonExpanded: boolean;
  onUpcomingSoonExpandedChange: (expanded: boolean) => void;
  onMapRecenter: () => void;
  onMeetMarkerSelect: (meetId: string) => void;
  onSelectMeet: (meetId: string) => void;
};

export function DashboardMeetsSection({
  dashboardLoading,
  activeMapMeets,
  upcomingMapMeets,
  activeLiveRiderCount,
  liveMapPreview,
  openMapHref,
  previewMapCenter,
  previewMapRiders,
  previewFitPoints,
  selectedMeetRoute,
  dashboardUserLocation,
  dashboardMapMarkers,
  selectedMapMeetId,
  selectedMapMeet,
  mapRecenterSignal,
  activeNowExpanded,
  onActiveNowExpandedChange,
  upcomingSoonExpanded,
  onUpcomingSoonExpandedChange,
  onMapRecenter,
  onMeetMarkerSelect,
  onSelectMeet,
}: DashboardMeetsSectionProps) {
  return (
    <section className="space-y-4">
      {dashboardLoading ? (
        <DashboardMeetsMapSkeleton />
      ) : (
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]">
          <div className="relative h-56 bg-[#07080a]">
            <div className="absolute inset-0">
              <MeetMap
                lat={previewMapCenter.lat}
                lng={previewMapCenter.lng}
                meetPoint="Meet activity"
                route={selectedMeetRoute}
                riders={previewMapRiders}
                selfLocation={dashboardUserLocation}
                showSelfMarker={!!dashboardUserLocation}
                initialZoom={13}
                fitPoints={previewFitPoints}
                compact
                interactive
                hideHint
                showMeetMarker={false}
                showDestination={selectedMeetRoute.length > 1}
                meetMarkers={dashboardMapMarkers}
                selectedMeetMarkerId={selectedMapMeetId}
                onMeetMarkerSelect={onMeetMarkerSelect}
                recenterSignal={mapRecenterSignal}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/80" />
            <div className="pointer-events-none absolute left-3 top-3 max-w-[58%] sm:max-w-[calc(100%-10rem)]">
              <p className="truncate rounded-full border border-[#b4141e]/50 bg-black/55 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-[#f1c3c7] backdrop-blur-md">
                {activeMapMeets.length} active • {upcomingMapMeets.length} upcoming •{" "}
                {liveMapPreview.activeRiderCount} live
              </p>
            </div>

            <div className="absolute right-3 top-3 z-[500] flex items-center gap-2">
              <button
                type="button"
                onClick={onMapRecenter}
                className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-zinc-200 backdrop-blur-md transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
              >
                Recenter
              </button>
              <Link
                href={openMapHref}
                className="rounded-full border border-[#b4141e]/50 bg-black/55 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-[#f1c3c7] backdrop-blur-md transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/10 hover:text-[#e87a82]"
              >
                View Live Map
              </Link>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 right-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">
                {activeMapMeets.length > 0 ? "Active now" : "Upcoming meets"}
              </p>
              <h2 className="mt-1 truncate font-serif text-2xl leading-none text-white">
                {selectedMapMeet?.name ||
                  liveMapPreview.ride?.name ||
                  activeMapMeets[0]?.name ||
                  upcomingMapMeets[0]?.name ||
                  "Tap a meet marker"}
              </h2>
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-300">
                Tap markers to view, join, or navigate
              </p>
            </div>
          </div>
        </article>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
        {activeMapMeets.length === 0 ? (
          <div className="flex w-full items-center">
            <p className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f1c3c7]">
              Active Now (0)
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onActiveNowExpandedChange(!activeNowExpanded)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={activeNowExpanded}
          >
            <div className="flex min-w-0 items-center gap-2">
              <p className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f1c3c7]">
                Active Now ({activeMapMeets.length})
              </p>
              <span className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-[#f1c3c7]">
                {activeLiveRiderCount} live
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/meets"
                onClick={(event) => event.stopPropagation()}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
              >
                See All
              </Link>
              <span className="text-sm text-zinc-500" aria-hidden>
                {activeNowExpanded ? "−" : "+"}
              </span>
            </div>
          </button>
        )}

        {activeNowExpanded && activeMapMeets.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {dashboardLoading &&
              Array.from({ length: 2 }).map((_, index) => (
                <DashboardMeetCardSkeleton key={`active-now-${index}`} />
              ))}

            {!dashboardLoading && activeMapMeets.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-500">
                No active meets right now. Host a meet or join an upcoming meet to enable live rider
                tracking.
              </p>
            ) : null}

            {!dashboardLoading &&
              activeMapMeets.slice(0, 3).map((meet) => (
                <DashboardMeetCard
                  key={meet.id}
                  meet={meet}
                  onSelectMeet={onSelectMeet}
                />
              ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
        {upcomingMapMeets.length === 0 ? (
          <div className="flex w-full items-center">
            <p className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f1c3c7]">
              Upcoming Soon (0)
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onUpcomingSoonExpandedChange(!upcomingSoonExpanded)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={upcomingSoonExpanded}
          >
            <p className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f1c3c7]">
              Upcoming Soon ({upcomingMapMeets.length})
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/meets"
                onClick={(event) => event.stopPropagation()}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
              >
                See All
              </Link>
              <span className="text-sm text-zinc-500" aria-hidden>
                {upcomingSoonExpanded ? "−" : "+"}
              </span>
            </div>
          </button>
        )}

        {upcomingSoonExpanded && upcomingMapMeets.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {dashboardLoading &&
              Array.from({ length: 2 }).map((_, index) => (
                <DashboardMeetCardSkeleton key={`upcoming-soon-${index}`} />
              ))}

            {!dashboardLoading &&
              upcomingMapMeets.slice(0, 3).map((meet) => (
                <DashboardMeetCard
                  key={meet.id}
                  meet={meet}
                  onSelectMeet={onSelectMeet}
                  showMeta
                />
              ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

function DashboardMeetCard({
  meet,
  onSelectMeet,
  showMeta = false,
}: {
  meet: DashboardMapMeet;
  onSelectMeet: (meetId: string) => void;
  showMeta?: boolean;
}) {
  const showNavigation = meet.lifecyclePhase === "active" && dashboardMeetHasRoute(meet);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25 p-3 transition hover:border-[#b4141e]/45 hover:bg-[#b4141e]/10">
      <button
        type="button"
        onClick={() => onSelectMeet(meet.id)}
        className="block w-full text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#b4141e]/30 bg-gradient-to-br from-[#3a0709] via-[#140608] to-black">
            {meet.cover ? (
              <Image
                src={meet.cover}
                alt={meet.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(135deg,transparent_0%,transparent_42%,rgba(255,255,255,0.14)_43%,transparent_46%,transparent_100%)]" />
                <div className="absolute bottom-2 left-2 right-2 truncate text-[8px] uppercase tracking-[0.16em] text-[#f1c3c7]">
                  {dashboardMeetLifecycleLabel(meet.lifecyclePhase)}
                </div>
              </>
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <h3 className="truncate font-serif text-lg leading-tight text-white">{meet.name}</h3>
            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.1em] text-[#e87a82]">
              {formatDashboardMeetTime(meet.date, meet.time)}
            </p>
            <p className="mt-1 truncate text-xs leading-5 text-zinc-400">{meet.meetPoint}</p>
            {showMeta ? (
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                <p className="min-w-0 truncate text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                  {meet.city}
                </p>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.08em] text-zinc-500">
                  {meet.riderCount} going
                </span>
                {meet.liveRiderCount > 0 ? (
                  <span className="shrink-0 rounded-full border border-[#b4141e]/35 bg-[#b4141e]/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[#f1c3c7]">
                    {meet.liveRiderCount} live
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </button>
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={meetDetailHref(meet.id, "dashboard")}
            className="flex items-center justify-center rounded-lg border border-white/10 px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] text-zinc-200 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
          >
            View Meet
          </Link>
          {showNavigation ? (
            <StartRideLink
              meet={dashboardMeetToStartRideInput(meet)}
              label="Navigate to Meet"
              className="flex items-center justify-center rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 px-3 py-2.5 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#b4141e]/40"
            />
          ) : hasMapsNavigationTarget({ lat: meet.lat, lng: meet.lng }) ? (
            <NavigateToMeetButton
              target={{ lat: meet.lat, lng: meet.lng, label: meet.meetPoint }}
              className="flex items-center justify-center rounded-lg border border-white/10 px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] text-zinc-200 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
            />
          ) : (
            <button
              type="button"
              onClick={() => onSelectMeet(meet.id)}
              className="flex items-center justify-center rounded-lg border border-white/10 px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] text-zinc-200 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
            >
              Map Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
