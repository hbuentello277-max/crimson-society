"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const RideMap = dynamic(() => import("@/components/RideMap"), {
  ssr: false,
});

type RoutePoint = {
  lat: number;
  lng: number;
};

type RideWaypoint = RoutePoint & {
  id: string;
  label: string;
};

type StoredRideData = {
  id?: unknown;
  hostId?: unknown;
  route?: unknown;
  waypoints?: unknown;
  name?: unknown;
  meetPoint?: unknown;
  destination?: unknown;
  trackingStatus?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
};

type RideTrackingStatus = "not_started" | "active" | "ended";

type ActiveRide = {
  id: string | null;
  hostId: string | null;
  route: RoutePoint[];
  waypoints: RideWaypoint[];
  name: string;
  meetPoint: string;
  destination: string;
  trackingStatus: RideTrackingStatus;
  startedAt: string | null;
  endedAt: string | null;
};

type LiveLocationRow = {
  ride_id: string;
  user_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  sharing_enabled: boolean;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
};

type LiveRideRider = {
  user_id: string;
  rider_name: string | null;
  rider_photo: string | null;
  lat: number;
  lng: number;
};

type RideLifecycleRow = {
  host_id: string | null;
  status: string | null;
  tracking_status: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type SharingStatus = "idle" | "requesting" | "sharing" | "stopping";

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 12000,
};

function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "lat" in value &&
    "lng" in value &&
    typeof (value as RoutePoint).lat === "number" &&
    typeof (value as RoutePoint).lng === "number" &&
    Number.isFinite((value as RoutePoint).lat) &&
    Number.isFinite((value as RoutePoint).lng)
  );
}

function parseRoute(value: unknown) {
  if (!Array.isArray(value)) return [];
  const route = value.filter(isRoutePoint);
  return route.length > 2 ? route : [];
}

function parseWaypoints(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is RideWaypoint => {
    return (
      isRoutePoint(item) &&
      "id" in item &&
      "label" in item &&
      typeof item.id === "string" &&
      typeof item.label === "string"
    );
  });
}

function parseTrackingStatus(value: unknown): RideTrackingStatus {
  return value === "active" || value === "ended" ? value : "not_started";
}

function parseStoredRide(stored: string | null): ActiveRide | null {
  if (!stored) return null;

  try {
    const rideData = JSON.parse(stored) as StoredRideData;
    const route = parseRoute(rideData.route);

    if (route.length === 0) return null;

    return {
      id: typeof rideData.id === "string" && rideData.id.trim() ? rideData.id : null,
      hostId:
        typeof rideData.hostId === "string" && rideData.hostId.trim() ? rideData.hostId : null,
      route,
      waypoints: parseWaypoints(rideData.waypoints),
      name: typeof rideData.name === "string" && rideData.name.trim() ? rideData.name : "Active ride",
      meetPoint:
        typeof rideData.meetPoint === "string" && rideData.meetPoint.trim()
          ? rideData.meetPoint
          : "Meet point",
      destination:
        typeof rideData.destination === "string" && rideData.destination.trim()
          ? rideData.destination
          : "Destination",
      trackingStatus: parseTrackingStatus(rideData.trackingStatus),
      startedAt:
        typeof rideData.startedAt === "string" && rideData.startedAt.trim()
          ? rideData.startedAt
          : null,
      endedAt:
        typeof rideData.endedAt === "string" && rideData.endedAt.trim() ? rideData.endedAt : null,
    };
  } catch (error) {
    console.error("Failed to load active ride:", error);
    return null;
  }
}

function riderName(profile: ProfileRow | null | undefined) {
  return (
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    "Rider"
  );
}

function riderPhoto(profile: ProfileRow | null | undefined) {
  return profile?.profile_image_url || profile?.avatar_url || null;
}

function formatLastUpdated(value: string | null, referenceTime = Date.now()) {
  if (!value) return "Not sharing";

  const diffSeconds = Math.max(0, Math.floor((referenceTime - new Date(value).getTime()) / 1000));
  if (diffSeconds < 10) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RideTrackingPage() {
  const { session, loading: authLoading } = useAuth();
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>("idle");
  const [liveRiders, setLiveRiders] = useState<LiveRideRider[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState<"starting" | "ending" | null>(null);
  const [now, setNow] = useState(Date.now());
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(0);
  const sharingRef = useRef(false);

  const userId = session?.user?.id ?? null;
  const origin = activeRide?.route[0] ?? null;
  const hasRoute = !!activeRide && !!origin && activeRide.route.length > 0;
  const trackingStatus = activeRide?.trackingStatus ?? "not_started";
  const isRideLive = trackingStatus === "active";
  const isRideEnded = trackingStatus === "ended";
  const isHost = !!activeRide?.hostId && !!userId && activeRide.hostId === userId;
  const canShare = !!activeRide?.id && !!userId && !authLoading && isRideLive;
  const isSharing = sharingStatus === "sharing";
  const isStopping = sharingStatus === "stopping";
  const activeRiderCount = liveRiders.length;
  const rideStateCopy = useMemo(() => {
    if (isRideLive) {
      return {
        label: isSharing ? "Sharing Live" : sharingStatus === "requesting" ? "Requesting GPS" : "Live Now",
        helper:
          "The ride is active. Riders can share live location only after tapping start and granting browser permission.",
      };
    }

    if (isRideEnded) {
      return {
        label: "Ride Ended",
        helper: activeRide?.endedAt
          ? `Ended ${formatLastUpdated(activeRide.endedAt)}. Live sharing is now disabled.`
          : "This ride has ended. Live sharing is now disabled.",
      };
    }

    return {
      label: "Not Started Yet",
      helper: isHost
        ? "Start the ride when the group is ready. Location sharing stays off until riders opt in."
        : "Waiting for the host to start the ride. Location sharing is disabled until then.",
    };
  }, [activeRide?.endedAt, isHost, isRideEnded, isRideLive, isSharing, sharingStatus]);
  const statusLabel = useMemo(() => {
    return rideStateCopy.label;
  }, [rideStateCopy.label]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("crimson-active-ride");
    setActiveRide(parseStoredRide(stored));
    setLoaded(true);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const clearLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const applyRideLifecycle = useCallback((row: RideLifecycleRow) => {
    setActiveRide((current) => {
      if (!current) return current;

      return {
        ...current,
        hostId: row.host_id || current.hostId,
        trackingStatus: parseTrackingStatus(row.tracking_status),
        startedAt: row.started_at,
        endedAt: row.ended_at,
      };
    });
  }, []);

  const loadRideLifecycle = useCallback(async () => {
    if (!activeRide?.id) return;

    const { data, error } = await supabase
      .from("rides")
      .select("host_id, status, tracking_status, started_at, ended_at")
      .eq("id", activeRide.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load ride lifecycle:", error);
      return;
    }

    if (data) applyRideLifecycle(data as RideLifecycleRow);
  }, [activeRide?.id, applyRideLifecycle]);

  useEffect(() => {
    if (!activeRide?.id) return;

    void loadRideLifecycle();

    const channel = supabase
      .channel(`ride-lifecycle-${activeRide.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `id=eq.${activeRide.id}`,
        },
        () => {
          void loadRideLifecycle();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeRide?.id, loadRideLifecycle]);

  useEffect(() => {
    if (!activeRide) return;

    window.sessionStorage.setItem(
      "crimson-active-ride",
      JSON.stringify({
        id: activeRide.id,
        hostId: activeRide.hostId,
        route: activeRide.route,
        waypoints: activeRide.waypoints,
        name: activeRide.name,
        meetPoint: activeRide.meetPoint,
        destination: activeRide.destination,
        trackingStatus: activeRide.trackingStatus,
        startedAt: activeRide.startedAt,
        endedAt: activeRide.endedAt,
      })
    );
  }, [activeRide]);

  const stopSharingLocation = useCallback(async () => {
    sharingRef.current = false;
    clearLocationWatch();
    setSharingStatus("stopping");

    if (activeRide?.id && userId) {
      const { error } = await supabase
        .from("ride_live_locations")
        .delete()
        .eq("ride_id", activeRide.id)
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to stop live location sharing:", error);
        setLocationError("Could not stop sharing in Supabase. Try again.");
      }
    }

    setLastUpdatedAt(null);
    setSharingStatus("idle");
  }, [activeRide?.id, clearLocationWatch, userId]);

  useEffect(() => {
    if (isRideLive || (sharingStatus !== "sharing" && sharingStatus !== "requesting")) return;

    void stopSharingLocation();
  }, [isRideLive, sharingStatus, stopSharingLocation]);

  const savePosition = useCallback(
    async (position: GeolocationPosition, force = false) => {
      if (!activeRide?.id || !userId || !sharingRef.current || !isRideLive) return;

      const nowMs = Date.now();
      if (!force && nowMs - lastSentAtRef.current < 2500) return;

      lastSentAtRef.current = nowMs;
      setLocationError(null);

      const updatedAt = new Date().toISOString();
      const { error } = await supabase.from("ride_live_locations").upsert(
        {
          ride_id: activeRide.id,
          user_id: userId,
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          heading:
            typeof position.coords.heading === "number" && Number.isFinite(position.coords.heading)
              ? position.coords.heading
              : null,
          speed:
            typeof position.coords.speed === "number" && Number.isFinite(position.coords.speed)
              ? position.coords.speed
              : null,
          sharing_enabled: true,
          updated_at: updatedAt,
        },
        { onConflict: "ride_id,user_id" }
      );

      if (error) {
        console.error("Failed to save live location:", error);
        setLocationError("Could not publish your live location.");
        return;
      }

      setLastUpdatedAt(updatedAt);
    },
    [activeRide?.id, isRideLive, userId]
  );

  const startSharingLocation = useCallback(() => {
    if (!canShare) {
      setPermissionError(
        isRideLive
          ? "Open tracking from a meet while signed in before sharing location."
          : "The host must start the ride before live location sharing is available."
      );
      return;
    }

    if (!("geolocation" in navigator)) {
      setPermissionError("Location sharing is not available on this device.");
      return;
    }

    setSharingStatus("requesting");
    setPermissionError(null);
    setLocationError(null);
    sharingRef.current = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void savePosition(position, true);
        setSharingStatus("sharing");

        clearLocationWatch();
        watchIdRef.current = navigator.geolocation.watchPosition(
          (nextPosition) => {
            void savePosition(nextPosition);
          },
          (error) => {
            setLocationError(error.message || "Unable to read your live location.");
          },
          WATCH_OPTIONS
        );
      },
      (error) => {
        sharingRef.current = false;
        setSharingStatus("idle");
        setPermissionError(error.message || "Location permission was denied.");
      },
      WATCH_OPTIONS
    );
  }, [canShare, clearLocationWatch, isRideLive, savePosition]);

  const startRide = useCallback(async () => {
    if (!activeRide?.id || !userId || !isHost) return;

    setLifecycleBusy("starting");
    setLifecycleError(null);

    const startedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("rides")
      .update({
        tracking_status: "active",
        started_at: startedAt,
        ended_at: null,
      })
      .eq("id", activeRide.id)
      .eq("host_id", userId)
      .select("host_id, status, tracking_status, started_at, ended_at")
      .maybeSingle();

    setLifecycleBusy(null);

    if (error) {
      console.error("Failed to start ride:", error);
      setLifecycleError("Could not start the ride. Try again.");
      return;
    }

    if (!data) {
      setLifecycleError("Only the meet host can start this ride.");
      return;
    }

    applyRideLifecycle(data as RideLifecycleRow);
  }, [activeRide?.id, applyRideLifecycle, isHost, userId]);

  const endRide = useCallback(async () => {
    if (!activeRide?.id || !userId || !isHost) return;

    setLifecycleBusy("ending");
    setLifecycleError(null);

    const endedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("rides")
      .update({
        tracking_status: "ended",
        ended_at: endedAt,
      })
      .eq("id", activeRide.id)
      .eq("host_id", userId)
      .select("host_id, status, tracking_status, started_at, ended_at")
      .maybeSingle();

    setLifecycleBusy(null);

    if (error) {
      console.error("Failed to end ride:", error);
      setLifecycleError("Could not end the ride. Try again.");
      return;
    }

    if (!data) {
      setLifecycleError("Only the meet host can end this ride.");
      return;
    }

    applyRideLifecycle(data as RideLifecycleRow);
    await stopSharingLocation();
    setLiveRiders([]);
  }, [activeRide?.id, applyRideLifecycle, isHost, stopSharingLocation, userId]);

  const loadLiveLocations = useCallback(async () => {
    if (!activeRide?.id || !isRideLive) {
      setLiveRiders([]);
      return;
    }

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("ride_live_locations")
      .select("ride_id, user_id, lat, lng, heading, speed, sharing_enabled, updated_at")
      .eq("ride_id", activeRide.id)
      .eq("sharing_enabled", true)
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to load live rider locations:", error);
      return;
    }

    const rows = (data || []) as LiveLocationRow[];
    const profileIds = Array.from(new Set(rows.map((row) => row.user_id)));

    const { data: profiles, error: profilesError } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, full_name, profile_image_url, avatar_url")
          .in("id", profileIds)
      : { data: [], error: null };

    if (profilesError) {
      console.error("Failed to load live rider profiles:", profilesError);
    }

    const profileMap = new Map(
      ((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );

    setLiveRiders(
      rows.map((row) => {
        const profile = profileMap.get(row.user_id);

        return {
          user_id: row.user_id,
          rider_name: riderName(profile),
          rider_photo: riderPhoto(profile),
          lat: row.lat,
          lng: row.lng,
        };
      })
    );
  }, [activeRide?.id, isRideLive]);

  useEffect(() => {
    if (!activeRide?.id) return;

    void loadLiveLocations();

    const channel = supabase
      .channel(`ride-live-locations-${activeRide.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ride_live_locations",
          filter: `ride_id=eq.${activeRide.id}`,
        },
        () => {
          void loadLiveLocations();
        }
      )
      .subscribe();

    const refresh = window.setInterval(() => {
      void loadLiveLocations();
    }, 30000);

    return () => {
      window.clearInterval(refresh);
      void supabase.removeChannel(channel);
    };
  }, [activeRide?.id, loadLiveLocations]);

  useEffect(() => {
    return () => {
      sharingRef.current = false;
      clearLocationWatch();

      if (activeRide?.id && userId) {
        void supabase
          .from("ride_live_locations")
          .delete()
          .eq("ride_id", activeRide.id)
          .eq("user_id", userId);
      }
    };
  }, [activeRide?.id, clearLocationWatch, userId]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 44% at 50% 0%, rgba(104,0,11,0.42), transparent 58%), linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 34%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1080px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+28px)] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            Ride Tracking
          </p>

          <Link
            href="/rides"
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
          >
            Meets
          </Link>
        </div>

        {!loaded && (
          <section className="mt-8 flex flex-1 items-center justify-center">
            <p className="text-sm text-zinc-500">Loading ride...</p>
          </section>
        )}

        {loaded && !hasRoute && (
          <section className="mt-8 flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.025] p-6 text-center shadow-[0_22px_60px_-38px_rgba(0,0,0,0.95)]">
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#d85f6c]">
                No Route Loaded
              </p>
              <h1 className="mt-3 font-serif text-[34px] leading-none text-[#f4f0ea]">
                No active ride selected.
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Open a meet and start ride tracking from its route details.
              </p>
              <Link
                href="/rides"
                className="mt-5 inline-flex rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/40"
              >
                Back to Meets
              </Link>
            </div>
          </section>
        )}

        {loaded && hasRoute && activeRide && origin && (
          <>
            <header className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">
                {statusLabel}
              </p>
              <h1 className="mt-3 font-serif text-[42px] leading-none text-[#f4f0ea] sm:text-6xl">
                {activeRide.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                {rideStateCopy.helper}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <RouteInfo label="Meet Point" value={activeRide.meetPoint} />
                <RouteInfo label="Destination" value={activeRide.destination} />
                <RouteInfo label="Active Riders" value={String(activeRiderCount)} />
              </div>
            </header>

            <section className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]">
              <RideMap
                lat={origin.lat}
                lng={origin.lng}
                meetPoint={activeRide.meetPoint}
                route={activeRide.route}
                riders={liveRiders}
                height={420}
                interactive
                hideHint
                showDestination={activeRide.route.length > 1}
                showWaypoints={activeRide.waypoints.length > 0}
                waypoints={activeRide.waypoints}
              />
            </section>

            <section className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    Ride Lifecycle
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {isRideLive
                      ? "Ride is live. Active riders can opt in to share location."
                      : isRideEnded
                        ? "Ride is complete. Live rider locations have been disabled."
                        : "Ride has not started. The host controls when live tracking opens."}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
                    <span>
                      Started:{" "}
                      {activeRide.startedAt ? formatLastUpdated(activeRide.startedAt, now) : "Not started"}
                    </span>
                    <span>
                      Ended: {activeRide.endedAt ? formatLastUpdated(activeRide.endedAt, now) : "Not ended"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:min-w-48">
                  {isHost && !isRideLive && !isRideEnded && (
                    <button
                      type="button"
                      onClick={() => void startRide()}
                      disabled={lifecycleBusy !== null}
                      className="rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/40 disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
                    >
                      {lifecycleBusy === "starting" ? "Starting" : "Start Ride"}
                    </button>
                  )}

                  {isHost && isRideLive && (
                    <button
                      type="button"
                      onClick={() => void endRide()}
                      disabled={lifecycleBusy !== null}
                      className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 disabled:opacity-60"
                    >
                      {lifecycleBusy === "ending" ? "Ending" : "End Ride"}
                    </button>
                  )}

                  {!isHost && !isRideLive && (
                    <span className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      {isRideEnded ? "Ride Complete" : "Waiting on Host"}
                    </span>
                  )}
                </div>
              </div>

              {lifecycleError && (
                <div className="mt-4 rounded-lg border border-[#7f111b]/50 bg-[#7f111b]/12 px-4 py-3 text-sm text-[#f0c9ce]">
                  {lifecycleError}
                </div>
              )}
            </section>

            <section className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    Live Location
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Share only when you choose. Active locations expire after 30 minutes and stop
                    when the meet is no longer active.
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
                    <span>Last updated: {formatLastUpdated(lastUpdatedAt, now)}</span>
                    <span>
                      {isRideLive
                        ? canShare
                          ? "Ready for live sharing"
                          : "Sign in from a meet to share"
                        : isRideEnded
                          ? "Sharing closed"
                          : "Sharing opens when host starts ride"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:min-w-48">
                  {isSharing || isStopping ? (
                    <button
                      type="button"
                      onClick={() => void stopSharingLocation()}
                      disabled={isStopping}
                      className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 disabled:opacity-60"
                    >
                      {isStopping ? "Stopping" : "Stop Sharing Location"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startSharingLocation}
                      disabled={!canShare || sharingStatus === "requesting"}
                      className="rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/40 disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
                    >
                      {sharingStatus === "requesting" ? "Requesting GPS" : "Start Sharing Location"}
                    </button>
                  )}
                </div>
              </div>

              {(permissionError || locationError) && (
                <div className="mt-4 rounded-lg border border-[#7f111b]/50 bg-[#7f111b]/12 px-4 py-3 text-sm text-[#f0c9ce]">
                  {permissionError || locationError}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function RouteInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3">
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">{label}</p>
      <p className="mt-1 text-sm text-zinc-300">{value}</p>
    </div>
  );
}
