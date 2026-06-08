"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  readActiveMeetSession,
  writeActiveMeetSession,
} from "@/lib/meets/active-meet-session";
import { activeMeetFromSessionPayload } from "@/lib/meets/bootstrap-active-meet";
import {
  loadNavigationMeet,
  type NavigationMeet,
} from "@/lib/meets/load-navigation-meet";
import {
  clearMeetLiveLocation,
  publishMeetLiveLocation,
} from "@/lib/meets/publish-live-location";
import { useNavigationGps } from "@/lib/meets/use-navigation-gps";
import { hasRoadGeometry } from "@/lib/meets/route-geometry";

const MeetMap = dynamic(() => import("@/components/MeetMap"), {
  ssr: false,
});

type PageState = "loading" | "ready" | "error";

function gpsStatusLabel(gpsState: string) {
  switch (gpsState) {
    case "requesting":
      return "Requesting GPS";
    case "active":
      return "GPS Active";
    case "denied":
      return "Permission Denied";
    case "unavailable":
      return "GPS Unavailable";
    case "error":
      return "GPS Error";
    default:
      return "Waiting for GPS";
  }
}

export default function MeetNavigationPage() {
  const params = useParams<{ id: string }>();
  const meetId = typeof params.id === "string" ? params.id : null;
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [meet, setMeet] = useState<NavigationMeet | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const lastSentAtRef = useRef(0);
  const gpsBootstrappedRef = useRef(false);

  const handleGpsPosition = useCallback(
    (position: GeolocationPosition) => {
      if (!meet?.id || !userId || meet.trackingStatus !== "active") return;

      void publishMeetLiveLocation({
        meetId: meet.id,
        userId,
        position,
        lastSentAtRef,
      }).then((result) => {
        if (!result.ok) {
          setShareError(result.error ?? "Could not share live location.");
        } else {
          setShareError(null);
        }
      });
    },
    [meet?.id, meet?.trackingStatus, userId],
  );

  const {
    gpsState,
    userLocation,
    gpsError,
    requestGps,
    recenter,
    recenterSignal,
    clearWatch,
  } = useNavigationGps({
    enabled: pageState === "ready" && !!meet,
    onPosition: handleGpsPosition,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    if (!meetId) {
      setLoadError("Invalid meet link.");
      setPageState("error");
      return;
    }

    let cancelled = false;

    async function bootstrapMeet() {
      setPageState("loading");
      setLoadError(null);

      const sessionPayload = readActiveMeetSession();
      const sessionMeet = sessionPayload ? activeMeetFromSessionPayload(sessionPayload) : null;
      if (sessionMeet?.id === meetId && hasRoadGeometry(sessionMeet.route)) {
        const { meet: loadedMeet, error } = await loadNavigationMeet(meetId!, userId);
        if (cancelled) return;

        if (loadedMeet) {
          writeActiveMeetSession(loadedMeet);
          setMeet(loadedMeet);
          setPageState("ready");
          return;
        }

        if (error) {
          setLoadError(error);
          setPageState("error");
          return;
        }
      }

      const { meet: loadedMeet, error } = await loadNavigationMeet(meetId!, userId);
      if (cancelled) return;

      if (!loadedMeet) {
        setLoadError(error ?? "Could not load navigation for this meet.");
        setPageState("error");
        return;
      }

      writeActiveMeetSession(loadedMeet);
      setMeet(loadedMeet);
      setPageState("ready");
    }

    void bootstrapMeet();

    return () => {
      cancelled = true;
    };
  }, [authLoading, meetId, router, userId]);

  useEffect(() => {
    if (pageState !== "ready" || !meet || gpsBootstrappedRef.current) return;
    gpsBootstrappedRef.current = true;
    requestGps();
  }, [meet, pageState, requestGps]);

  useEffect(() => {
    return () => {
      clearWatch();
      if (meet?.id && userId) {
        void clearMeetLiveLocation(meet.id, userId);
      }
    };
  }, [clearWatch, meet?.id, userId]);

  const mapCenter = userLocation ?? meet?.route[0] ?? { lat: 29.4241, lng: -98.4936 };
  const hasRoute = !!meet && hasRoadGeometry(meet.route);

  if (authLoading || pageState === "loading") {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050405] text-zinc-100">
        <div className="mx-auto max-w-sm px-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Meet Navigation</p>
          <h1 className="mt-3 font-serif text-3xl text-white">Loading route</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Fetching meet details and road geometry...
          </p>
        </div>
      </main>
    );
  }

  if (pageState === "error" || !meet || !hasRoute) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050405] px-6 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[#d85f6c]">Navigation Unavailable</p>
          <h1 className="mt-3 font-serif text-3xl text-[#f4f0ea]">Could not open navigation</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {loadError ?? "This meet does not have a valid route loaded."}
          </p>
          <Link
            href="/meets"
            className="mt-5 inline-flex rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd]"
          >
            Back to Meets
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-[#050405] text-zinc-100">
      <MeetMap
        lat={mapCenter.lat}
        lng={mapCenter.lng}
        meetPoint={meet.meetPoint}
        route={meet.route}
        selfLocation={userLocation}
        showSelfMarker
        compact
        interactive
        hideHint
        showDestination={meet.route.length > 1}
        recenterSignal={recenterSignal}
        initialZoom={14}
        fitPoints={userLocation ? [userLocation, ...meet.route] : meet.route}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] bg-gradient-to-b from-black/80 via-black/35 to-transparent px-4 pb-10 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="pointer-events-auto flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Meet Navigation</p>
            <h1 className="mt-1 truncate font-serif text-3xl leading-none text-white">{meet.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-200">
              <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
                {gpsStatusLabel(gpsState)}
              </span>
              {meet.distance ? (
                <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
                  {meet.distance}
                </span>
              ) : null}
              {meet.duration ? (
                <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
                  {meet.duration}
                </span>
              ) : null}
            </div>
          </div>

          <Link
            href="/meets"
            className="shrink-0 rounded-full border border-white/15 bg-black/55 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-200 backdrop-blur transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
          >
            Exit
          </Link>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-[600]">
        <div className="pointer-events-auto mx-auto grid max-w-md gap-3 rounded-2xl border border-white/10 bg-black/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Route</p>
            <p className="mt-1 text-sm text-zinc-200">
              {meet.meetPoint} → {meet.destination}
            </p>
            {meet.trackingStatus !== "active" ? (
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Personal GPS navigation is active. Live meet sharing opens when the host starts the meet.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Meet is live. Your location is shown on this map and shared with the group.
              </p>
            )}
          </div>

          {(gpsState === "denied" || gpsState === "error" || gpsState === "unavailable") && (
            <div className="rounded-xl border border-[#b4141e]/50 bg-[#10080a]/90 px-4 py-3 text-sm leading-5 text-[#f0c9ce]">
              {gpsError ?? "GPS permission is required for navigation."}
            </div>
          )}

          {shareError ? (
            <div className="rounded-xl border border-[#b4141e]/40 bg-[#10080a]/70 px-4 py-3 text-xs leading-5 text-[#f0c9ce]">
              {shareError}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={recenter}
              disabled={!userLocation}
              className="rounded-xl border border-white/10 px-3 py-3 text-[10px] uppercase tracking-[0.14em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7] disabled:cursor-not-allowed disabled:text-zinc-600"
            >
              Recenter
            </button>
            <button
              type="button"
              onClick={() => {
                gpsBootstrappedRef.current = false;
                requestGps();
              }}
              className="rounded-xl border border-[#b4141e]/70 bg-[#b4141e]/25 px-3 py-3 text-[10px] uppercase tracking-[0.14em] text-[#f4dadd] transition hover:bg-[#b4141e]/40"
            >
              {gpsState === "denied" || gpsState === "error" ? "Retry GPS" : "Refresh GPS"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
