"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  activeMeetFromSessionPayload,
  bootstrapActiveMeetFromDb,
} from "@/lib/meets/bootstrap-active-meet";
import {
  readActiveMeetSession,
  writeActiveMeetSession,
} from "@/lib/meets/active-meet-session";
import { hasRoadGeometry, parseRoute } from "@/lib/meets/route-geometry";

const MeetMap = dynamic(() => import("@/components/MeetMap"), {
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
  rider_username?: string | null;
  rider_display_name?: string | null;
  rider_photo: string | null;
  lat: number;
  lng: number;
  last_updated_at?: string | null;
  last_updated_label?: string | null;
  profile_href?: string | null;
};

type RideLiveMapRow = {
  id: string;
  status: string | null;
  tracking_status: string | null;
};

type RideShareCandidateRow = {
  id: string;
  name: string | null;
  host_id: string | null;
  status: string | null;
  tracking_status: string | null;
  started_at: string | null;
  date?: string | null;
  time?: string | null;
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

function sessionPayloadToActiveRide(payload: ReturnType<typeof readActiveMeetSession>): ActiveRide | null {
  if (!payload) return null;

  const normalized = activeMeetFromSessionPayload(payload);
  if (!normalized) return null;

  return {
    id: normalized.id,
    hostId: normalized.hostId,
    route: normalized.route,
    waypoints: parseWaypoints(normalized.waypoints),
    name: normalized.name,
    meetPoint: normalized.meetPoint,
    destination: normalized.destination,
    trackingStatus: normalized.trackingStatus,
    startedAt: normalized.startedAt,
    endedAt: normalized.endedAt,
  };
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

function profileHref(username?: string | null) {
  const clean = username?.trim().replace(/^@+/, "");
  return clean ? `/profile/${encodeURIComponent(clean)}` : null;
}

function distanceInMiles(from: RoutePoint, to: RoutePoint) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

function formatDistanceAway(userLocation: RoutePoint | null, rider: Pick<LiveRideRider, "lat" | "lng">) {
  if (!userLocation) return "Distance unavailable";

  const miles = distanceInMiles(userLocation, { lat: rider.lat, lng: rider.lng });
  if (miles < 0.1) return "Nearby";
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
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

export default function MeetLiveMapPage() {
  const { session, loading: authLoading } = useAuth();
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [liveMapMode, setLiveMapMode] = useState(false);
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>("idle");
  const [liveRiders, setLiveRiders] = useState<LiveRideRider[]>([]);
  const [userLocation, setUserLocation] = useState<RoutePoint | null>(null);
  const [selfProfile, setSelfProfile] = useState<ProfileRow | null>(null);
  const [liveShareRide, setLiveShareRide] = useState<RideShareCandidateRow | null>(null);
  const [liveShareError, setLiveShareError] = useState<string | null>(null);
  const [userLocationError, setUserLocationError] = useState<string | null>(null);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [privacyMenuOpen, setPrivacyMenuOpen] = useState(false);
  const [globalActiveMeetCount, setGlobalActiveMeetCount] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState<"starting" | "ending" | null>(null);
  const [now, setNow] = useState(Date.now());
  const watchIdRef = useRef<number | null>(null);
  const mapWatchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(0);
  const sharingRef = useRef(false);
  const publishedRideIdRef = useRef<string | null>(null);

  const userId = session?.user?.id ?? null;
  const origin = activeRide?.route[0] ?? null;
  const hasRoute = !!activeRide && !!origin && hasRoadGeometry(activeRide.route);
  const trackingStatus = activeRide?.trackingStatus ?? "not_started";
  const isRideLive = trackingStatus === "active";
  const isRideEnded = trackingStatus === "ended";
  const isHost = !!activeRide?.hostId && !!userId && activeRide.hostId === userId;
  const sharingRideId = liveMapMode ? liveShareRide?.id ?? null : activeRide?.id ?? null;
  const sharingRideActive = liveMapMode ? !!liveShareRide?.id : isRideLive;
  const canShare = !!sharingRideId && !!userId && !authLoading && sharingRideActive;
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
  const mappedLiveRiders = useMemo(
    () =>
      liveRiders.map((rider) => ({
        ...rider,
        distance_label: formatDistanceAway(userLocation, rider),
        last_updated_label: rider.last_updated_at
          ? `Updated ${formatLastUpdated(rider.last_updated_at, now)}`
          : rider.last_updated_label || null,
      })),
    [liveRiders, now, userLocation]
  );
  const visibleMapRiders = useMemo(() => {
    if (!liveMapMode || !userId || isSharing) return mappedLiveRiders;
    return mappedLiveRiders.filter((rider) => rider.user_id !== userId);
  }, [isSharing, liveMapMode, mappedLiveRiders, userId]);
  const selfMapRider = useMemo(() => {
    if (!userId || !userLocation) return null;

    const displayName = selfProfile ? riderName(selfProfile) : "You";

    return {
      user_id: userId,
      rider_name: displayName,
      rider_username: selfProfile?.username || null,
      rider_display_name: displayName,
      rider_photo: riderPhoto(selfProfile),
      lat: userLocation.lat,
      lng: userLocation.lng,
      last_updated_label: "Current GPS location",
      profile_href: profileHref(selfProfile?.username),
    };
  }, [selfProfile, userId, userLocation]);
  const liveMapCenter = userLocation ||
    (visibleMapRiders[0] ? { lat: visibleMapRiders[0].lat, lng: visibleMapRiders[0].lng } : null) || {
      lat: 29.4241,
      lng: -98.4936,
    };
  const liveMapDisplayedRiderCount =
    liveMapMode && userId && isSharing && !mappedLiveRiders.some((rider) => rider.user_id === userId)
      ? mappedLiveRiders.length + 1
      : visibleMapRiders.length;

  useEffect(() => {
    setLiveMapMode(true);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) {
      setSelfProfile(null);
      return;
    }

    let active = true;

    const loadSelfProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, full_name, profile_image_url, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Failed to load current rider profile:", error);
        setSelfProfile(null);
        return;
      }

      setSelfProfile((data as ProfileRow | null) ?? null);
    };

    void loadSelfProfile();

    return () => {
      active = false;
    };
  }, [userId]);

  const clearLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const clearMapLocationWatch = useCallback(() => {
    if (mapWatchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(mapWatchIdRef.current);
      mapWatchIdRef.current = null;
    }
  }, []);

  const loadLiveShareRide = useCallback(async () => {
    if (!userId) {
      setLiveShareRide(null);
      return null;
    }

    const { data: attendeeRows, error: attendeeError } = await supabase
      .from("ride_attendees")
      .select("ride_id")
      .eq("user_id", userId);

    if (attendeeError) {
      console.error("Failed to load active ride attendance:", attendeeError);
    }

    const attendingRideIds = Array.from(
      new Set(((attendeeRows || []) as { ride_id: string }[]).map((row) => row.ride_id))
    );

    const hostedQuery = supabase
      .from("rides")
      .select("id, name, host_id, status, tracking_status, started_at, date, time")
      .eq("status", "active")
      .eq("tracking_status", "active")
      .eq("host_id", userId)
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(5);

    const attendingQuery = attendingRideIds.length
      ? supabase
          .from("rides")
          .select("id, name, host_id, status, tracking_status, started_at, date, time")
          .eq("status", "active")
          .eq("tracking_status", "active")
          .in("id", attendingRideIds)
          .order("started_at", { ascending: false, nullsFirst: false })
          .limit(5)
      : Promise.resolve({ data: [], error: null });

    const [{ data: hostedRows, error: hostedError }, { data: attendingRows, error: attendingError }] =
      await Promise.all([hostedQuery, attendingQuery]);

    if (hostedError) {
      console.error("Failed to load hosted active rides:", hostedError);
    }

    if (attendingError) {
      console.error("Failed to load attending active rides:", attendingError);
    }

    const uniqueCandidates = new Map<string, RideShareCandidateRow>();
    for (const row of [
      ...((hostedRows || []) as RideShareCandidateRow[]),
      ...((attendingRows || []) as RideShareCandidateRow[]),
    ]) {
      uniqueCandidates.set(row.id, row);
    }

    const candidates = Array.from(uniqueCandidates.values()).sort((a, b) => {
      const aTime = new Date(a.started_at || `${a.date || ""}T${a.time || "00:00"}`).getTime();
      const bTime = new Date(b.started_at || `${b.date || ""}T${b.time || "00:00"}`).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });

    const nextRide = candidates[0] || null;
    setLiveShareRide(nextRide);
    return nextRide;
  }, [userId]);

  useEffect(() => {
    if (!liveMapMode) return;

    if (!("geolocation" in navigator)) {
      setUserLocationError("Location is not available on this device.");
      return;
    }

    const applyPosition = (position: GeolocationPosition) => {
      setUserLocation({
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
      });
      setUserLocationError(null);
    };

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (error) => {
        setUserLocationError(error.message || "Location permission was denied.");
      },
      WATCH_OPTIONS
    );

    mapWatchIdRef.current = navigator.geolocation.watchPosition(
      applyPosition,
      (error) => {
        setUserLocationError(error.message || "Unable to update your location.");
      },
      WATCH_OPTIONS
    );

    return () => {
      clearMapLocationWatch();
    };
  }, [clearMapLocationWatch, liveMapMode]);

  useEffect(() => {
    if (!liveMapMode || authLoading || !session) return;

    void loadLiveShareRide();

    const channel = supabase
      .channel("live-share-ride-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
        },
        () => {
          void loadLiveShareRide();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authLoading, liveMapMode, loadLiveShareRide, session]);

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
    if (!activeRide?.id || !hasRoadGeometry(activeRide.route)) return;

    writeActiveMeetSession({
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
    });
  }, [activeRide]);

  const stopSharingLocation = useCallback(async (rideIdOverride?: string | null) => {
    sharingRef.current = false;
    clearLocationWatch();
    setSharingStatus("stopping");

    const targetRideId = rideIdOverride ?? sharingRideId ?? publishedRideIdRef.current;

    if (targetRideId && userId) {
      const { error } = await supabase
        .from("ride_live_locations")
        .delete()
        .eq("ride_id", targetRideId)
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to stop live location sharing:", error);
        setLocationError("Could not stop sharing in Supabase. Try again.");
      }
    }

    publishedRideIdRef.current = null;
    setLastUpdatedAt(null);
    setSharingStatus("idle");
  }, [clearLocationWatch, sharingRideId, userId]);

  useEffect(() => {
    if (!liveMapMode || !isSharing || liveShareRide) return;

    setLiveShareError("Your active meet is no longer live. Location sharing was turned off.");
    void stopSharingLocation();
  }, [isSharing, liveMapMode, liveShareRide, stopSharingLocation]);

  useEffect(() => {
    if (liveMapMode) return;
    if (isRideLive || (sharingStatus !== "sharing" && sharingStatus !== "requesting")) return;

    void stopSharingLocation();
  }, [isRideLive, liveMapMode, sharingStatus, stopSharingLocation]);

  const savePosition = useCallback(
    async (position: GeolocationPosition, force = false, rideIdOverride?: string | null) => {
      const targetRideId = rideIdOverride ?? sharingRideId;
      const targetRideIsActive = liveMapMode && rideIdOverride ? true : sharingRideActive;
      if (!targetRideId || !userId || !sharingRef.current || !targetRideIsActive) return;

      const nowMs = Date.now();
      if (!force && nowMs - lastSentAtRef.current < 2500) return;

      lastSentAtRef.current = nowMs;
      setLocationError(null);

      const updatedAt = new Date().toISOString();
      const { error } = await supabase.from("ride_live_locations").upsert(
        {
          ride_id: targetRideId,
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

      publishedRideIdRef.current = targetRideId;
      setLastUpdatedAt(updatedAt);
    },
    [liveMapMode, sharingRideActive, sharingRideId, userId]
  );

  const startSharingLocation = useCallback(async () => {
    const shareRide = liveMapMode && !liveShareRide ? await loadLiveShareRide() : liveShareRide;
    const targetRideId = liveMapMode ? shareRide?.id ?? null : sharingRideId;
    const canStartSharing =
      !!targetRideId && !!userId && !authLoading && (liveMapMode ? !!shareRide?.id : sharingRideActive);

    if (!canStartSharing) {
      setPermissionError(
        liveMapMode
          ? "Join or host an active meet before sharing your live location."
          : isRideLive
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
    setLiveShareError(null);
    sharingRef.current = true;
    publishedRideIdRef.current = targetRideId;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void savePosition(position, true, targetRideId);
        setSharingStatus("sharing");

        clearLocationWatch();
        watchIdRef.current = navigator.geolocation.watchPosition(
          (nextPosition) => {
            void savePosition(nextPosition, false, targetRideId);
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
  }, [
    authLoading,
    clearLocationWatch,
    isRideLive,
    liveMapMode,
    liveShareRide,
    loadLiveShareRide,
    savePosition,
    sharingRideActive,
    sharingRideId,
    userId,
  ]);

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
        const displayName = riderName(profile);

        return {
          user_id: row.user_id,
          rider_name: displayName,
          rider_username: profile?.username || null,
          rider_display_name: displayName,
          rider_photo: riderPhoto(profile),
          lat: row.lat,
          lng: row.lng,
          last_updated_at: row.updated_at,
          profile_href: profileHref(profile?.username),
        };
      })
    );
  }, [activeRide?.id, isRideLive]);

  const loadGlobalLiveLocations = useCallback(async () => {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("ride_live_locations")
      .select("ride_id, user_id, lat, lng, heading, speed, sharing_enabled, updated_at")
      .eq("sharing_enabled", true)
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to load global live rider locations:", error);
      return;
    }

    const rows = (data || []) as LiveLocationRow[];
    const rideIds = Array.from(new Set(rows.map((row) => row.ride_id)));

    const { data: rideRows, error: rideError } = rideIds.length
      ? await supabase
          .from("rides")
          .select("id, status, tracking_status")
          .in("id", rideIds)
      : { data: [], error: null };

    if (rideError) {
      console.error("Failed to load active live rides:", rideError);
    }

    const activeRideIds = new Set(
      ((rideRows || []) as RideLiveMapRow[])
        .filter((ride) => ride.status === "active" && ride.tracking_status === "active")
        .map((ride) => ride.id)
    );
    const activeRows = rows.filter((row) => activeRideIds.has(row.ride_id));
    const profileIds = Array.from(new Set(activeRows.map((row) => row.user_id)));

    const { data: profiles, error: profilesError } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, full_name, profile_image_url, avatar_url")
          .in("id", profileIds)
      : { data: [], error: null };

    if (profilesError) {
      console.error("Failed to load global live rider profiles:", profilesError);
    }

    const profileMap = new Map(
      ((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );

    setGlobalActiveMeetCount(activeRideIds.size);
    setLiveRiders(
      activeRows.map((row) => {
        const profile = profileMap.get(row.user_id);
        const displayName = riderName(profile);

        return {
          user_id: row.user_id,
          rider_name: displayName,
          rider_username: profile?.username || null,
          rider_display_name: displayName,
          rider_photo: riderPhoto(profile),
          lat: row.lat,
          lng: row.lng,
          last_updated_at: row.updated_at,
          profile_href: profileHref(profile?.username),
        };
      })
    );
  }, []);

  useEffect(() => {
    if (liveMapMode) return;
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeRide?.id, liveMapMode, loadLiveLocations]);

  useEffect(() => {
    if (!liveMapMode || authLoading || !session) return;

    void loadGlobalLiveLocations();

    const channel = supabase
      .channel("global-live-rider-map")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ride_live_locations",
        },
        () => {
          void loadGlobalLiveLocations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authLoading, liveMapMode, loadGlobalLiveLocations, session]);

  useEffect(() => {
    return () => {
      const targetRideId = publishedRideIdRef.current || sharingRideId;
      sharingRef.current = false;
      clearLocationWatch();
      clearMapLocationWatch();

      if (targetRideId && userId) {
        void supabase
          .from("ride_live_locations")
          .delete()
          .eq("ride_id", targetRideId)
          .eq("user_id", userId);
      }
    };
  }, [clearLocationWatch, clearMapLocationWatch, sharingRideId, userId]);

  if (loaded && liveMapMode) {
    return (
      <main className="fixed inset-0 z-50 overflow-hidden bg-[#050405] text-zinc-100">
        <MeetMap
          lat={liveMapCenter.lat}
          lng={liveMapCenter.lng}
          meetPoint="Live riders"
          route={[]}
          riders={visibleMapRiders}
          selfLocation={userLocation}
          selfRider={selfMapRider}
          showSelfMarker
          compact
          interactive
          hideHint
          showMeetMarker={false}
          recenterSignal={recenterSignal}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] bg-gradient-to-b from-black/75 via-black/35 to-transparent px-4 pb-10 pt-[calc(env(safe-area-inset-top)+14px)]">
          <div className="pointer-events-auto flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">
                Live Rider Map
              </p>
              <h1 className="mt-1 truncate font-serif text-3xl leading-none text-white">
                Who&apos;s riding tonight?
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-200">
                <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
                  {liveMapDisplayedRiderCount} rider{liveMapDisplayedRiderCount === 1 ? "" : "s"} live
                </span>
                <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur">
                  {globalActiveMeetCount} active meet{globalActiveMeetCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Location privacy"
                onClick={() => setPrivacyMenuOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-2xl leading-none text-zinc-100 backdrop-blur transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
              >
                ⋮
              </button>

              <Link
                href="/dashboard"
                className="rounded-full border border-white/15 bg-black/55 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-200 backdrop-blur transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7]"
              >
                Close
              </Link>
            </div>
          </div>
        </div>

        {privacyMenuOpen && (
          <div className="pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+72px)] z-[700] w-[min(280px,calc(100vw-32px))] rounded-2xl border border-white/12 bg-black/85 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.62)] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">
              Location Privacy
            </p>
            <div className="mt-4 grid gap-3 text-sm text-zinc-100">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span aria-hidden className="text-[#f1c3c7]">
                  ☑
                </span>
                <span>Share with Friends</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span aria-hidden className="text-[#f1c3c7]">
                  ☑
                </span>
                <span>Share with Current Meet</span>
              </div>
            </div>
            <Link
              href="/connect"
              className="mt-4 flex rounded-xl border border-[#b4141e]/60 bg-[#b4141e]/20 px-3 py-3 text-[10px] uppercase tracking-[0.16em] text-[#f4dadd] transition hover:bg-[#b4141e]/35"
            >
              Manage Friends
            </Link>
            <button
              type="button"
              onClick={() => setPrivacyMenuOpen(false)}
              className="mt-2 w-full rounded-xl border border-white/10 px-3 py-3 text-[10px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              Close
            </button>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-[600]">
          <div className="pointer-events-auto mx-auto grid max-w-xs gap-3 rounded-2xl border border-white/10 bg-black/75 p-4 text-center shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div>
              <p className="text-[11px] font-semibold text-zinc-100">Location Sharing</p>
              <button
                type="button"
                aria-pressed={isSharing}
                aria-label={isSharing ? "Turn location sharing off" : "Turn location sharing on"}
                onClick={() => {
                  if (isSharing) {
                    void stopSharingLocation();
                  } else {
                    void startSharingLocation();
                  }
                }}
                disabled={sharingStatus === "requesting" || isStopping || authLoading || !session}
                className={`mx-auto mt-3 flex h-9 w-28 items-center rounded-full border px-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSharing
                    ? "justify-end border-[#b4141e] bg-[#b4141e] shadow-[0_0_24px_rgba(180,20,30,0.38)]"
                    : "justify-start border-zinc-600/40 bg-zinc-800/85"
                }`}
              >
                <span
                  className={`h-7 w-7 rounded-full shadow-[0_8px_18px_rgba(0,0,0,0.45)] transition ${
                    isSharing ? "bg-white" : "bg-zinc-500"
                  }`}
                />
              </button>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Visible to:</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {isSharing ? "Friends • Current Meet" : "Nobody"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRecenterSignal((value) => value + 1)}
              disabled={!userLocation}
              className="w-full rounded-xl border border-white/10 px-3 py-3 text-[10px] uppercase tracking-[0.14em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:text-[#f1c3c7] disabled:cursor-not-allowed disabled:text-zinc-600"
            >
              Recenter
            </button>
          </div>

          {(permissionError || locationError || liveShareError || userLocationError) && (
            <div className="pointer-events-auto mx-auto mt-2 max-w-md rounded-xl border border-[#b4141e]/50 bg-[#10080a]/90 px-4 py-3 text-xs leading-5 text-[#f0c9ce] backdrop-blur">
              {permissionError || locationError || liveShareError || userLocationError}
            </div>
          )}
        </div>
      </main>
    );
  }

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
            href="/meets"
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
                Open a meet with a saved route from the meets page, or join a hosted meet with
                valid meet and destination coordinates.
              </p>
              <Link
                href="/meets"
                className="mt-5 inline-flex rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#b4141e]/40"
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
              <MeetMap
                lat={origin.lat}
                lng={origin.lng}
                meetPoint={activeRide.meetPoint}
                route={activeRide.route}
                riders={mappedLiveRiders}
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
                      className="rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#b4141e]/40 disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
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
                <div className="mt-4 rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/12 px-4 py-3 text-sm text-[#f0c9ce]">
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
                      className="rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#b4141e]/40 disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
                    >
                      {sharingStatus === "requesting" ? "Requesting GPS" : "Start Sharing Location"}
                    </button>
                  )}
                </div>
              </div>

              {(permissionError || locationError) && (
                <div className="mt-4 rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/12 px-4 py-3 text-sm text-[#f0c9ce]">
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
