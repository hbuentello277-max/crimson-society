"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import { supabase } from "@/lib/supabase";
import { RideDetailsModal } from "@/components/rides/RideDetailsModal";
import { HostRideModal } from "@/components/rides/HostRideModal";
import type { HostRideForm } from "@/components/rides/HostRideModal";
import { buildSnappedRoute } from "@/lib/routing";

type RoutePoint = { lat: number; lng: number };
type RideWaypoint = RoutePoint & { id: string; label: string };

export type RideType = "Night Run" | "Track Day" | "Touring" | "Group Ride" | "Canyon Run";
export type RidePrivacy = "Open" | "Invite";

type Rider = {
  name: string;
  photo: string;
};

export type Ride = {
  id: string;
  hostId?: string;
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  destination: string;
  city: string;
  type: RideType;
  distance: string;
  duration: string;
  cover: string;
  host: Rider;
  going: Rider[];
  description: string;
  privacy: RidePrivacy;
  lat: number;
  lng: number;
  route?: RoutePoint[];
  waypoints?: RideWaypoint[];
};

type RideRow = {
  id: string;
  host_id: string;
  name: string;
  date: string;
  time: string;
  meet_point: string;
  meet_point_lat: number | null;
  meet_point_lng: number | null;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  city: string | null;
  type: RideType;
  privacy: RidePrivacy;
  distance: string | null;
  duration: string | null;
  description: string | null;
  cover: string | null;
  route: unknown;
  waypoints: unknown;
  host?: {
    id: string;
    username: string | null;
    display_name: string | null;
    full_name: string | null;
    profile_image_url: string | null;
    avatar_url: string | null;
  } | null;
};

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=900&fit=crop";

const DEFAULT_HOST_PHOTO =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces";

const PHOTOS = {
  marco:
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces",
  aiyana:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
};

const UPCOMING_MEETS: Ride[] = [
  {
    id: "r1",
    name: "Sunday Canyon Run",
    date: "Sun May 24",
    time: "5:30 AM",
    meetPoint: "Buc-ee's, Katy",
    destination: "Pedernales Falls State Park",
    city: "Houston, TX",
    type: "Canyon Run",
    distance: "180 mi",
    duration: "5h",
    cover:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&h=900&fit=crop",
    host: { name: "Marco Velez", photo: PHOTOS.marco },
    going: [],
    description:
      "Dawn meet, full tank, no stops till the gorge. Pace is measured and the line stays clean.",
    privacy: "Open",
    lat: 29.7858,
    lng: -95.8244,
    route: [
      { lat: 29.7858, lng: -95.8244 },
      { lat: 30.2667, lng: -98.1711 },
    ],
  },
  {
    id: "r2",
    name: "Midnight on the Loop",
    date: "Fri May 29",
    time: "11:00 PM",
    meetPoint: "Memorial Park",
    destination: "Downtown Houston Loop",
    city: "Houston, TX",
    type: "Night Run",
    distance: "60 mi",
    duration: "1.5h",
    cover: DEFAULT_COVER,
    host: { name: "Aiyana Cross", photo: PHOTOS.aiyana },
    going: [],
    description: "Cold air, clean lines, no theater. Finish over coffee.",
    privacy: "Open",
    lat: 29.7642,
    lng: -95.431,
    route: [
      { lat: 29.7642, lng: -95.431 },
      { lat: 29.7604, lng: -95.3698 },
    ],
  },
];

function formatTime(time: string) {
  if (!time) return "";

  if (
    time.includes("AM") ||
    time.includes("PM") ||
    time.includes("am") ||
    time.includes("pm")
  ) {
    return time;
  }

  if (!time.includes(":")) return time;

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours));
  date.setMinutes(Number(minutes));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

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

function parseRoute(value: unknown): RoutePoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRoutePoint);
}

function parseWaypoints(value: unknown): RideWaypoint[] {
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

function rideRowToRide(row: RideRow): Ride {
  const savedRoute = parseRoute(row.route);
  const fallbackRoute =
    row.meet_point_lat !== null &&
    row.meet_point_lng !== null &&
    row.destination_lat !== null &&
    row.destination_lng !== null
      ? [
          { lat: row.meet_point_lat, lng: row.meet_point_lng },
          { lat: row.destination_lat, lng: row.destination_lng },
        ]
      : [];

  const route = savedRoute.length > 0 ? savedRoute : fallbackRoute;
  const waypoints = parseWaypoints(row.waypoints);
  const hostProfile = row.host;

  const hostName =
    hostProfile?.display_name?.trim() ||
    hostProfile?.full_name?.trim() ||
    hostProfile?.username?.trim() ||
    "Crimson Member";

  const hostPhoto =
    hostProfile?.profile_image_url ||
    hostProfile?.avatar_url ||
    DEFAULT_HOST_PHOTO;

  return {
    id: row.id,
    hostId: row.host_id,
    name: row.name,
    date: row.date,
    time: row.time,
    meetPoint: row.meet_point,
    destination: row.destination,
    city: row.city || row.meet_point,
    type: row.type,
    distance: row.distance || "TBD",
    duration: row.duration || "TBD",
    cover: row.cover || DEFAULT_COVER,
    host: {
      name: hostName,
      photo: hostPhoto,
    },
    going: [],
    description: row.description || "Meet details coming soon.",
    privacy: row.privacy,
    lat: row.meet_point_lat || 29.4241,
    lng: row.meet_point_lng || -98.4936,
    route,
    waypoints,
  };
}     

function rideToForm(ride: Ride): HostRideForm {
  const destinationPoint = ride.route?.[1];

  return {
    cover: ride.cover,
    name: ride.name,
    date: ride.date,
    time: ride.time,
    meetPoint: ride.meetPoint,
    meetPointLat: ride.lat,
    meetPointLng: ride.lng,
    destination: ride.destination,
    destinationLat: destinationPoint?.lat ?? null,
    destinationLng: destinationPoint?.lng ?? null,
    distance: ride.distance === "TBD" ? "" : ride.distance,
    duration: ride.duration === "TBD" ? "" : ride.duration,
    type: ride.type,
    privacy: ride.privacy,
    description: ride.description === "Meet details coming soon." ? "" : ride.description,
  };
}

function RideCard({
  ride,
  isGoing,
  canManage,
  onJoin,
  onViewDetails,
  onEdit,
  onCancel,
}: {
  ride: Ride;
  isGoing: boolean;
  canManage: boolean;
  onJoin: () => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]">
      <div className="grid gap-0 sm:grid-cols-[144px_1fr]">
        <div className="relative h-40 sm:h-full">
          <Image
            src={ride.cover}
            alt={ride.name}
            fill
            sizes="(max-width: 640px) 100vw, 144px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050405] via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/45 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-zinc-100 backdrop-blur-md">
            {ride.type}
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#d85f6c]">
                {ride.date} / {formatTime(ride.time)}
              </p>
              <h3 className="mt-2 font-serif text-[26px] leading-none text-[#f4f0ea]">
                {ride.name}
              </h3>
              <p className="mt-2 text-sm text-zinc-400">{ride.city}</p>
            </div>

            {ride.privacy === "Invite" && (
              <span className="shrink-0 rounded-md border border-[#7f111b]/45 bg-[#7f111b]/18 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[#f0c9ce]">
                Invite
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-300">
            <span>{ride.meetPoint}</span>
            <span className="text-zinc-700">/</span>
            <span>{ride.distance}</span>
            <span className="text-zinc-700">/</span>
            <span>{ride.duration}</span>
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
            {ride.description}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500">
              {ride.going.length + (isGoing ? 1 : 0)} going
            </span>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onViewDetails}
                className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
              >
                View Route
              </button>

              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-[#7f111b]/60 bg-[#7f111b]/18 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0c9ce] transition hover:bg-[#7f111b]/28"
                  >
                    Cancel
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onJoin}
                className={`rounded-lg border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition ${
                  isGoing
                    ? "border-[#7f111b]/80 bg-[#7f111b]/24 text-[#f4dadd]"
                    : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#7f111b]/60 hover:bg-[#7f111b]/16"
                }`}
              >
                {isGoing ? "Going" : "Join"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function RidesPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [going, setGoing] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [realMeets, setRealMeets] = useState<Ride[]>([]);
  const [showHostModal, setShowHostModal] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);

  const [meetTab, setMeetTab] = useState<"upcoming" | "completed">("upcoming");

  const allMeets = realMeets;

  function getRideDateTime(ride: Ride) {
  const date = ride.date?.trim();
  const time = ride.time?.trim();

  if (!date) return null;

  const safeTime = time && time.includes(":") ? time : "23:59";
  const parsed = new Date(`${date}T${safeTime}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

  const upcomingMeets = allMeets.filter((ride) => {
  const dateTime = getRideDateTime(ride);
  if (!dateTime) return true;
  return dateTime.getTime() >= Date.now();
});

  const completedMeets = allMeets.filter((ride) => {
  const dateTime = getRideDateTime(ride);
  if (!dateTime) return false;
  return dateTime.getTime() < Date.now();
});

   const visibleMeets =
  meetTab === "upcoming" ? upcomingMeets : completedMeets;

   const featuredRide = visibleMeets[0];
   const compactRides = visibleMeets.slice(1); 

  useEffect(() => {
    if (authLoading) return;

    const userId = session?.user?.id;

    if (!userId) {
      router.replace("/login");
      return;
    }

    let active = true;

    async function checkProfileSetup() {
      try {
        const complete = await requireCompleteProfile(userId as string);
        if (active && !complete) router.replace("/profile/setup");
      } catch {
        if (active) router.replace("/profile/setup");
      }
    }

    void checkProfileSetup();

    return () => {
      active = false;
    };
  }, [authLoading, session, router]);

  useEffect(() => {
    if (authLoading || !session?.user?.id) return;

    let active = true;

    async function loadMeets() {
      const { data, error } = await supabase
        .from("rides")
        .select('*')
        .eq("status", "active")
        .order("created_at", { ascending: false });

      const rows = (data || []) as RideRow[];

      const rideIds = rows.map((row) => row.id);

const { data: attendanceRows, error: attendanceError } = await supabase
  .from("ride_attendees")
  .select("ride_id, user_id")
  .in("ride_id", rideIds);

if (attendanceError) {
  console.error("Failed to load ride attendees:", attendanceError);
}

const nextGoing: Record<string, boolean> = {};
for (const attendee of attendanceRows || []) {
  if (attendee.user_id === session?.user.id) {
    nextGoing[attendee.ride_id] = true;
  }
}

if (active) {
  setGoing(nextGoing);
}

      const hostIds = Array.from(new Set(rows.map((row) => row.host_id).filter(Boolean)));

      const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, full_name, profile_image_url, avatar_url")
      .in("id", hostIds);

      if (profilesError) {
        console.error("Failed to load ride host profiles:", profilesError);
}

      const profileMap = new Map(
        (profiles || []).map((profile) => [profile.id, profile])
);

      const rowsWithHosts = rows.map((row) => ({
        ...row,
        host: profileMap.get(row.host_id) || null,
}));

      if (active) {
         setRealMeets(rowsWithHosts.map((row) => rideRowToRide(row as RideRow)));
}
      
      
}

    void loadMeets();

    return () => {
      active = false;
    };
  }, [authLoading, session?.user?.id]);

  async function toggleJoin(rideId: string) {
  if (!session?.user?.id) {
    setToast("You must be signed in to join a meet.");
    window.setTimeout(() => setToast(null), 2500);
    return;
  }

  const isCurrentlyGoing = !!going[rideId];

  if (isCurrentlyGoing) {
    const { error } = await supabase
      .from("ride_attendees")
      .delete()
      .eq("ride_id", rideId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Failed to leave meet:", error);
      setToast("Could not leave meet.");
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    setGoing((current) => ({
      ...current,
      [rideId]: false,
    }));

    setToast("Meet left.");
    window.setTimeout(() => setToast(null), 2000);
    return;
  }

  const { error } = await supabase
    .from("ride_attendees")
    .upsert(
      {
        ride_id: rideId,
        user_id: session.user.id,
        status: "going",
      },
      {
        onConflict: "ride_id,user_id",
      }
    );

  if (error) {
    console.error("Failed to join meet:", error);
    setToast("Could not join meet.");
    window.setTimeout(() => setToast(null), 2500);
    return;
  }

  setGoing((current) => ({
    ...current,
    [rideId]: true,
  }));

  setToast("Meet joined.");
  window.setTimeout(() => setToast(null), 2000);
}

  async function cancelMeet(rideId: string) {
const confirmed = window.confirm("Cancel this meet?");
if (!confirmed) return;

if (!session?.user?.id) {
setToast("You must be signed in to cancel a meet.");
window.setTimeout(() => setToast(null), 2500);
return;
}

const { error } = await supabase
.from("rides")
.update({ status: "canceled" })
.eq("id", rideId)
.eq("host_id", session.user.id)

if (error) {
console.error("Failed to cancel meet FULL:", error);
setToast(`Could not cancel meet: ${error.message}`);
window.setTimeout(() => setToast(null), 5000);
return;
}


setRealMeets((current) =>
current.filter((ride) => ride.id !== rideId)
);

if (selectedRide?.id === rideId) {
setSelectedRide(null);
}

setToast("Meet canceled.");
window.setTimeout(() => setToast(null), 2500);
}


  async function saveMeet(newRide: HostRideForm) {
    if (!session?.user?.id) return;

    const meetLat =
      typeof newRide.meetPointLat === "number" && Number.isFinite(newRide.meetPointLat)
        ? newRide.meetPointLat
        : null;

    const meetLng =
      typeof newRide.meetPointLng === "number" && Number.isFinite(newRide.meetPointLng)
        ? newRide.meetPointLng
        : null;

    const destinationLat =
      typeof newRide.destinationLat === "number" && Number.isFinite(newRide.destinationLat)
        ? newRide.destinationLat
        : null;

    const destinationLng =
      typeof newRide.destinationLng === "number" && Number.isFinite(newRide.destinationLng)
        ? newRide.destinationLng
        : null;

    let route: { lat: number; lng: number }[] = [];
let distance: string | null = newRide.distance || null;
let duration: string | null = newRide.duration || null;

if (
  meetLat !== null &&
  meetLng !== null &&
  destinationLat !== null &&
  destinationLng !== null
) {
  try {
    const snapped = await buildSnappedRoute({
      origin: {
        lat: meetLat,
        lng: meetLng,
      },
      destination: {
        lat: destinationLat,
        lng: destinationLng,
      },
    });

    route = snapped.geometry;

    distance = `${(snapped.distanceMeters * 0.000621371).toFixed(1)} mi`;

    duration = `${Math.round(
      snapped.durationSeconds / 60
    )} min`;
  } catch (error) {
    console.error("Route generation failed", error);

    route = [
      { lat: meetLat, lng: meetLng },
      { lat: destinationLat, lng: destinationLng },
    ];
  }
}

    const payload = {
      host_id: session.user.id,
      name: newRide.name,
      date: newRide.date,
      time: newRide.time,
      meet_point: newRide.meetPoint,
      meet_point_lat: meetLat,
      meet_point_lng: meetLng,
      destination: newRide.destination,
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      city: newRide.meetPoint,
      type: newRide.type,
      privacy: newRide.privacy,
      distance,
      duration,
      description: newRide.description || null,
      cover: newRide.cover || DEFAULT_COVER,
      status: "active",
      route,
      waypoints: [],
    };

    const { data, error } = editingRide
      ? await supabase
          .from("rides")
          .update(payload)
          .eq("id", editingRide.id)
          .eq("host_id", session.user.id)
          .select("*")
          .single()
      : await supabase.from("rides").insert(payload).select("*").single();

    if (error) {
      console.error("Failed to save meet:", error);
      setToast(editingRide ? "Could not update meet." : "Could not create meet.");
      window.setTimeout(() => setToast(null), 2500);
      return;
    }

    const savedRide = rideRowToRide(data as RideRow);

    setRealMeets((current) =>
      editingRide
        ? current.map((ride) => (ride.id === editingRide.id ? savedRide : ride))
        : [savedRide, ...current]
    );

    if (selectedRide?.id === savedRide.id) {
      setSelectedRide(savedRide);
    }

    setShowHostModal(false);
    setEditingRide(null);
    setToast(editingRide ? "Meet updated!" : "Meet created!");
    window.setTimeout(() => setToast(null), 2500);
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

      <div className="relative mx-auto max-w-[1080px] px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+28px)] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            Meet Ledger
          </p>

          <button
            type="button"
            onClick={() => {
              setEditingRide(null);
              setShowHostModal(true);
            }}
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            + Host Meet
          </button>
        </div>

        <header className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">
            Featured Meets
          </p>

          <h1 className="mt-3 font-serif text-[46px] leading-none text-[#f4f0ea] sm:text-7xl">
            Meets
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Curated routes, disciplined company, and one clean line into live ride tracking.
          </p>
        </header>

        <div className="mt-7 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
  <button
    type="button"
    onClick={() => setMeetTab("upcoming")}
    className={`rounded-lg px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition ${
      meetTab === "upcoming"
        ? "bg-[#7f111b]/35 text-[#f4dadd]"
        : "text-zinc-500 hover:text-zinc-300"
    }`}
  >
    Upcoming ({upcomingMeets.length})
  </button>

  <button
    type="button"
    onClick={() => setMeetTab("completed")}
    className={`rounded-lg px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition ${
      meetTab === "completed"
        ? "bg-[#7f111b]/35 text-[#f4dadd]"
        : "text-zinc-500 hover:text-zinc-300"
    }`}
  >
    Past ({completedMeets.length})
  </button>
</div>       

        {featuredRide && (
          <section className="mt-7 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(127,17,27,0.1),rgba(255,255,255,0.025))]">
            <div className="relative h-[280px] sm:h-[360px]">
              <Image
                src={featuredRide.cover}
                alt={featuredRide.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1080px"
                className="object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050405] via-[#05040530] to-transparent" />

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-md border border-white/15 bg-black/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-100 backdrop-blur-md">
                  {featuredRide.type}
                </span>

                <span className="rounded-md border border-[#7f111b]/45 bg-[#7f111b]/20 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[#f0c9ce] backdrop-blur-md">
                  Featured
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <h2 className="font-serif text-[38px] leading-none text-[#f4f0ea] sm:text-6xl">
                  {featuredRide.name}
                </h2>

                <p className="mt-3 text-[10px] uppercase tracking-[0.19em] text-zinc-300">
                  {featuredRide.date} / {formatTime(featuredRide.time)}
                </p>

                <p className="mt-2 text-sm text-zinc-400">
                  {featuredRide.distance} / {featuredRide.duration} /{" "}
                  {featuredRide.meetPoint}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="max-w-2xl text-sm leading-6 text-zinc-300">
                {featuredRide.description}
              </p>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRide(featuredRide)}
                  className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
                >
                  View Route / Details
                </button>

                {featuredRide.hostId === session?.user?.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingRide(featuredRide)}
                      className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void cancelMeet(featuredRide.id)}
                      className="rounded-lg border border-[#7f111b]/60 bg-[#7f111b]/18 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f0c9ce] transition hover:bg-[#7f111b]/28"
                    >
                      Cancel
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => toggleJoin(featuredRide.id)}
                  className={`rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition ${
                    going[featuredRide.id]
                      ? "border-[#7f111b]/80 bg-[#7f111b]/24 text-[#f4dadd]"
                      : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#7f111b]/60 hover:bg-[#7f111b]/16"
                  }`}
                >
                  {going[featuredRide.id] ? "Going" : "JOIN MEET"}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              Upcoming Meets
            </p>

            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
              {allMeets.length} listed
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {compactRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                canManage={ride.hostId === session?.user?.id}
                onEdit={() => setEditingRide(ride)}
                isGoing={!!going[ride.id]}
                onCancel={() => void cancelMeet(ride.id)}
                onJoin={() => toggleJoin(ride.id)}
                onViewDetails={() => setSelectedRide(ride)}
              />
            ))}
          </div>
        </section>
      </div>

      {selectedRide && (
        <RideDetailsModal
          ride={selectedRide}
          isGoing={!!going[selectedRide.id]}
          onJoin={() => toggleJoin(selectedRide.id)}
          onClose={() => setSelectedRide(null)}
        />
      )}

      {(showHostModal || editingRide) && (
        <HostRideModal
          mode={editingRide ? "edit" : "create"}
          initialForm={editingRide ? rideToForm(editingRide) : undefined}
          onClose={() => {
            setShowHostModal(false);
            setEditingRide(null);
          }}
          onCreate={(newRide) => void saveMeet(newRide)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+86px)] z-50 mx-auto max-w-sm rounded-lg border border-[#7f111b]/55 bg-[#10080a]/95 px-4 py-3 text-center text-sm text-[#f0c9ce] shadow-[0_22px_60px_-28px_rgba(0,0,0,0.95)] backdrop-blur-md">
          {toast}
        </div>
      )}
    </main>
  );
}