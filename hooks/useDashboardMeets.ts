"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  buildDashboardMapMarkers,
  dashboardMeetHasRoute,
  groupDashboardMapMeets,
  type DashboardMapMeet,
} from "@/lib/meets/dashboard-map";
import { supabase } from "@/lib/supabase";
import { dashboardMeetToStartRideInput } from "@/components/meets/StartRideLink";
import { canJoinDashboardMeet, joinMeetAttendance } from "@/lib/meets/join-meet";
import { leaveMeetAttendance } from "@/lib/meets/leave-meet";
import { meetNavigationHref } from "@/lib/meets/load-navigation-meet";
import { writeActiveMeetSession } from "@/lib/meets/active-meet-session";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import { mapRideToDashboardMeet } from "@/lib/dashboard/map-ride-to-dashboard-meet";
import {
  emptyDashboardLiveMapPreview,
  type DashboardAttendeeRow,
  type DashboardLiveLocationRow,
  type DashboardLiveMapPreview,
  type DashboardProfileRow,
  type DashboardRideRow,
  type DashboardRoutePoint,
} from "@/lib/dashboard/types";

type UseDashboardMeetsOptions = {
  session: Session | null;
  isAdmin: boolean;
  router: AppRouterInstance;
  onToast: (message: string) => void;
};

export function useDashboardMeets({ session, isAdmin, router, onToast }: UseDashboardMeetsOptions) {
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [mapMeets, setMapMeets] = useState<DashboardMapMeet[]>([]);
  const [going, setGoing] = useState<Record<string, boolean>>({});
  const [liveMapPreview, setLiveMapPreview] =
    useState<DashboardLiveMapPreview>(emptyDashboardLiveMapPreview);
  const [dashboardUserLocation, setDashboardUserLocation] = useState<DashboardRoutePoint | null>(
    null,
  );
  const [selectedMapMeetId, setSelectedMapMeetId] = useState<string | null>(null);
  const [mapRecenterSignal, setMapRecenterSignal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [joinBusy, setJoinBusy] = useState(false);
  const [activeNowExpanded, setActiveNowExpanded] = useState(false);

  const loadDashboardSections = useCallback(async () => {
    if (!session) return;

    setDashboardLoading(true);

    const { data: rideData, error: ridesError } = await supabase
      .from(MEET_TABLES.meets)
      .select(
        "id, host_id, name, date, time, meet_point, destination, city, cover, route, waypoints, tracking_status, started_at, meet_duration_minutes, status, meet_point_lat, meet_point_lng, distance, duration, privacy, visibility",
      )
      .eq("status", "active")
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(24);

    if (ridesError) {
      console.error("Failed to load dashboard meets:", ridesError);
      setMapMeets([]);
      setGoing({});
      setLiveMapPreview(emptyDashboardLiveMapPreview);
      setDashboardLoading(false);
      return;
    }

    const rows = (rideData || []) as DashboardRideRow[];
    const rideIds = rows.map((ride) => ride.id);
    const loadNow = Date.now();

    if (rideIds.length === 0) {
      setMapMeets([]);
      setGoing({});
      setLiveMapPreview(emptyDashboardLiveMapPreview);
      setDashboardLoading(false);
      return;
    }

    const [
      { data: attendeeRows, error: attendeesError },
      { data: liveRows, error: liveError },
      { data: selfAttendanceRows, error: selfAttendanceError },
    ] = await Promise.all([
      supabase.from(MEET_TABLES.attendees).select("ride_id").in("ride_id", rideIds),
      supabase
        .from(MEET_TABLES.liveLocations)
        .select("ride_id, user_id, lat, lng, updated_at")
        .in("ride_id", rideIds)
        .eq("sharing_enabled", true)
        .gte("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()),
      session.user?.id
        ? supabase
            .from(MEET_TABLES.attendees)
            .select("ride_id")
            .eq("user_id", session.user.id)
            .in("ride_id", rideIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (attendeesError) {
      console.error("Failed to load dashboard meet attendees:", attendeesError);
    }

    if (liveError) {
      console.error("Failed to load dashboard live riders:", liveError);
    }

    if (selfAttendanceError) {
      console.error("Failed to load dashboard meet attendance:", selfAttendanceError);
    }

    const attendeeCounts = new Map<string, number>();
    for (const row of (attendeeRows || []) as DashboardAttendeeRow[]) {
      attendeeCounts.set(row.ride_id, (attendeeCounts.get(row.ride_id) || 0) + 1);
    }

    const liveLocations = (liveRows || []) as DashboardLiveLocationRow[];
    const liveCounts = new Map<string, number>();
    const liveUserIds = Array.from(new Set(liveLocations.map((row) => row.user_id)));
    let lastUpdatedAt: string | null = null;

    for (const row of liveLocations) {
      liveCounts.set(row.ride_id, (liveCounts.get(row.ride_id) || 0) + 1);
      if (!lastUpdatedAt || row.updated_at > lastUpdatedAt) lastUpdatedAt = row.updated_at;
    }

    const hostIds = Array.from(new Set(rows.map((row) => row.host_id).filter(Boolean)));
    const profileIds = Array.from(new Set([...liveUserIds, ...hostIds]));

    const { data: liveProfiles, error: liveProfilesError } = profileIds.length
      ? await supabase
          .from("public_profiles")
          .select("id, username, display_name, full_name, profile_image_url, avatar_url")
          .in("id", profileIds)
      : { data: [], error: null };

    if (liveProfilesError) {
      console.error("Failed to load dashboard live rider profiles:", liveProfilesError);
    }

    const liveProfileMap = new Map(
      ((liveProfiles || []) as DashboardProfileRow[]).map((profile) => [profile.id, profile]),
    );

    const hostNames = new Map<string, string>();
    for (const hostId of hostIds) {
      const profile = liveProfileMap.get(hostId);
      hostNames.set(
        hostId,
        profile?.display_name?.trim() ||
          profile?.full_name?.trim() ||
          profile?.username?.trim() ||
          "Crimson Member",
      );
    }

    const nextMeets = rows
      .map((ride) => mapRideToDashboardMeet(ride, attendeeCounts, liveCounts, hostNames, loadNow))
      .filter((ride): ride is DashboardMapMeet => !!ride);

    const nextGoing: Record<string, boolean> = {};
    for (const row of (selfAttendanceRows || []) as DashboardAttendeeRow[]) {
      nextGoing[row.ride_id] = true;
    }

    const previewRiders = liveLocations.slice(0, 5).map((location) => {
      const profile = liveProfileMap.get(location.user_id);
      return {
        userId: location.user_id,
        name:
          profile?.display_name?.trim() ||
          profile?.full_name?.trim() ||
          profile?.username?.trim() ||
          "Rider",
        username: profile?.username || null,
        photo: profile?.profile_image_url || profile?.avatar_url || null,
        lat: location.lat,
        lng: location.lng,
      };
    });

    const liveRide =
      nextMeets.find((ride) => ride.trackingStatus === "active" && (liveCounts.get(ride.id) || 0) > 0) ||
      nextMeets.find((ride) => ride.trackingStatus === "active") ||
      null;

    setMapMeets(nextMeets);
    setGoing(nextGoing);
    setLiveMapPreview({
      ride: liveRide,
      activeRiderCount: liveLocations.length,
      activeMeetCount: Array.from(liveCounts.values()).filter((count) => count > 0).length,
      lastUpdatedAt,
      riders: previewRiders,
    });
    setDashboardLoading(false);
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const timer = window.setTimeout(() => {
      void loadDashboardSections();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboardSections, session]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session || !("geolocation" in navigator)) return;

    let active = true;

    const setPosition = (position: GeolocationPosition) => {
      if (!active) return;
      setDashboardUserLocation({
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
      });
    };

    const loadGrantedLocation = async () => {
      try {
        if (!("permissions" in navigator)) return;
        const permission = await navigator.permissions.query({ name: "geolocation" });
        if (!active || permission.state !== "granted") return;

        navigator.geolocation.getCurrentPosition(setPosition, () => undefined, {
          enableHighAccuracy: false,
          maximumAge: 5 * 60 * 1000,
          timeout: 5000,
        });
      } catch {
        // Dashboard preview uses local location only when the browser already has permission.
      }
    };

    void loadGrantedLocation();

    return () => {
      active = false;
    };
  }, [session]);

  const openMapHref = "/meets/live?mode=global";
  const { active: activeMapMeets, upcoming: upcomingMapMeets } = groupDashboardMapMeets(
    mapMeets,
    now,
  );
  const activeLiveRiderCount = activeMapMeets.reduce(
    (total, meet) => total + meet.liveRiderCount,
    0,
  );
  const dashboardMapMarkers = buildDashboardMapMarkers(mapMeets, now);
  const selectedMapMeet = mapMeets.find((meet) => meet.id === selectedMapMeetId) ?? null;
  const selectedMapMeetJoin = selectedMapMeet
    ? canJoinDashboardMeet({
        meetId: selectedMapMeet.id,
        userId: session?.user?.id,
        hostId: selectedMapMeet.hostId,
        coHostId: selectedMapMeet.coHostId,
        privacy: selectedMapMeet.privacy,
        visibility: selectedMapMeet.visibility,
        status: selectedMapMeet.status,
        isAlreadyGoing: !!going[selectedMapMeet.id],
        isAdmin,
      })
    : { allowed: false, message: null };

  const handleJoinMapMeet = useCallback(async () => {
    if (!selectedMapMeet || !session?.user?.id || joinBusy) return;

    const eligibility = canJoinDashboardMeet({
      meetId: selectedMapMeet.id,
      userId: session.user.id,
      hostId: selectedMapMeet.hostId,
      coHostId: selectedMapMeet.coHostId,
      privacy: selectedMapMeet.privacy,
      visibility: selectedMapMeet.visibility,
      status: selectedMapMeet.status,
      isAlreadyGoing: !!going[selectedMapMeet.id],
      isAdmin,
    });

    if (!eligibility.allowed) {
      onToast(eligibility.message ?? "You cannot join this meet.");
      return;
    }

    setJoinBusy(true);
    const result = await joinMeetAttendance(selectedMapMeet.id, session.user.id);
    setJoinBusy(false);

    if (!result.ok) {
      onToast(result.error ?? "Could not join meet.");
      return;
    }

    setGoing((current) => ({ ...current, [selectedMapMeet.id]: true }));
    setMapMeets((current) =>
      current.map((meet) =>
        meet.id === selectedMapMeet.id ? { ...meet, riderCount: meet.riderCount + 1 } : meet,
      ),
    );
    onToast("Joined meet.");
  }, [going, isAdmin, joinBusy, onToast, selectedMapMeet, session?.user?.id]);

  const handleDashboardMeetMarkerSelect = useCallback(
    (meetId: string) => {
      const meet = mapMeets.find((item) => item.id === meetId);
      if (meet && meet.lifecyclePhase === "active" && dashboardMeetHasRoute(meet)) {
        writeActiveMeetSession(dashboardMeetToStartRideInput(meet));
        router.push(meetNavigationHref(meet.id));
        return;
      }

      setSelectedMapMeetId(meetId);
    },
    [mapMeets, router],
  );

  const handleLeaveMapMeet = useCallback(async () => {
    if (!selectedMapMeet || !session?.user?.id || joinBusy) return;

    if (!window.confirm("Leave this meet?")) return;

    setJoinBusy(true);
    const result = await leaveMeetAttendance(selectedMapMeet.id, session.user.id);
    setJoinBusy(false);

    if (!result.ok) {
      onToast(result.error ?? "Could not leave meet.");
      return;
    }

    setGoing((current) => ({ ...current, [selectedMapMeet.id]: false }));
    setMapMeets((current) =>
      current.map((meet) =>
        meet.id === selectedMapMeet.id
          ? { ...meet, riderCount: Math.max(0, meet.riderCount - 1) }
          : meet,
      ),
    );
    onToast("Meet left.");
  }, [joinBusy, onToast, selectedMapMeet, session?.user?.id]);

  const previewMapRiders = liveMapPreview.riders.slice(0, 5).map((rider) => {
    const cleanUsername = rider.username?.trim().replace(/^@+/, "") || null;

    return {
      user_id: rider.userId,
      rider_name: rider.name,
      rider_username: cleanUsername,
      rider_display_name: rider.name,
      rider_photo: rider.photo,
      lat: rider.lat,
      lng: rider.lng,
      profile_href: cleanUsername ? `/profile/${encodeURIComponent(cleanUsername)}` : null,
    };
  });
  const previewMapCenter =
    dashboardUserLocation ||
    (previewMapRiders[0] ? { lat: previewMapRiders[0].lat, lng: previewMapRiders[0].lng } : null) ||
    liveMapPreview.ride?.route[0] || { lat: 29.4241, lng: -98.4936 };
  const previewFitPoints = [
    ...(dashboardUserLocation ? [dashboardUserLocation] : []),
    ...previewMapRiders.map((rider) => ({ lat: rider.lat, lng: rider.lng })),
    ...dashboardMapMarkers.map((marker) => ({ lat: marker.lat, lng: marker.lng })),
  ];
  const selectedMeetRoute =
    selectedMapMeet && dashboardMeetHasRoute(selectedMapMeet) ? selectedMapMeet.route : [];

  return {
    dashboardLoading,
    mapMeets,
    going,
    liveMapPreview,
    dashboardUserLocation,
    selectedMapMeetId,
    setSelectedMapMeetId,
    mapRecenterSignal,
    setMapRecenterSignal,
    now,
    joinBusy,
    activeNowExpanded,
    setActiveNowExpanded,
    loadDashboardSections,
    openMapHref,
    activeMapMeets,
    upcomingMapMeets,
    activeLiveRiderCount,
    dashboardMapMarkers,
    selectedMapMeet,
    selectedMapMeetJoin,
    handleJoinMapMeet,
    handleDashboardMeetMarkerSelect,
    handleLeaveMapMeet,
    previewMapRiders,
    previewMapCenter,
    previewFitPoints,
    selectedMeetRoute,
  };
}
