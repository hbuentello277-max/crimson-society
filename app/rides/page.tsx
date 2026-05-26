"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LiveRideRider } from "@/components/RideMap";

const RideMap = dynamic(() => import("@/components/RideMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-[30px] border border-[rgba(255,255,255,0.08)] bg-[#0a0909]">
      <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
        Summoning the route
      </p>
    </div>
  ),
});

type RoutePoint = { lat: number; lng: number };
type RideType = "Night Run" | "Track Day" | "Touring" | "Group Ride" | "Canyon Run";
type RidePrivacy = "Open" | "Invite";

type Rider = {
  name: string;
  photo: string;
};

type Ride = {
  id: string;
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  city: string;
  type: RideType;
  distance: string;
  duration: string;
  cover: string;
  previewImage?: string;
  host: Rider;
  going: Rider[];
  description: string;
  privacy: RidePrivacy;
  lat: number;
  lng: number;
  route?: RoutePoint[];
};

type DraftRide = {
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  city: string;
  type: RideType;
  description: string;
  privacy: RidePrivacy;
  lat: number;
  lng: number;
  route: RoutePoint[];
  previewImage: string;
};

type LiveRiderRow = {
  ride_id: string;
  user_id: string;
  rider_name: string | null;
  rider_photo: string | null;
  lat: number;
  lng: number;
};

type LiveRidersState = Record<string, LiveRideRider[]>;

const PHOTOS = {
  marco:
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces",
  elena:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces",
  devin:
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces",
  aiyana:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
  roman:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
  sofia:
    "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&h=200&fit=crop&crop=faces",
};

const UPCOMING_SEED: Ride[] = [
  {
    id: "r1",
    name: "Sunday Canyon Run",
    date: "Sun May 24",
    time: "5:30 AM",
    meetPoint: "Buc-ee's, Katy",
    city: "Houston, TX",
    type: "Canyon Run",
    distance: "180 mi",
    duration: "5h",
    cover:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&h=900&fit=crop",
    previewImage:
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?w=1200&h=900&fit=crop",
    host: { name: "Marco Vélez", photo: PHOTOS.marco },
    going: [
      { name: "Elena", photo: PHOTOS.elena },
      { name: "Devin", photo: PHOTOS.devin },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Roman", photo: PHOTOS.roman },
    ],
    description:
      "Dawn meet, full tank, no stops till the gorge. Pace is measured. Bring water, a clear head, and enough restraint to enjoy the road.",
    privacy: "Open",
    lat: 29.7858,
    lng: -95.8244,
    route: [
      { lat: 29.7858, lng: -95.8244 },
      { lat: 29.7604, lng: -95.3698 },
      { lat: 29.713, lng: -95.234 },
      { lat: 29.684, lng: -95.102 },
    ],
  },
  {
    id: "r2",
    name: "Midnight on the Loop",
    date: "Fri May 22",
    time: "11:00 PM",
    meetPoint: "Memorial Park",
    city: "Houston, TX",
    type: "Night Run",
    distance: "60 mi",
    duration: "1.5h",
    cover:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=900&fit=crop",
    host: { name: "Aiyana Cross", photo: PHOTOS.aiyana },
    going: [
      { name: "Marco", photo: PHOTOS.marco },
      { name: "Roman", photo: PHOTOS.roman },
    ],
    description:
      "Cold air, clean lines, no theatre. We move with discipline and finish over coffee.",
    privacy: "Open",
    lat: 29.7642,
    lng: -95.431,
    route: [
      { lat: 29.7642, lng: -95.431 },
      { lat: 29.752, lng: -95.41 },
      { lat: 29.738, lng: -95.387 },
      { lat: 29.75, lng: -95.358 },
    ],
  },
  {
    id: "r3",
    name: "Track Day COTA",
    date: "Sat Jun 7",
    time: "8:00 AM",
    meetPoint: "COTA Paddock B",
    city: "Austin, TX",
    type: "Track Day",
    distance: "—",
    duration: "Full day",
    cover:
      "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=1200&h=900&fit=crop",
    previewImage:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&h=900&fit=crop",
    host: { name: "Devin Cole", photo: PHOTOS.devin },
    going: [
      { name: "Elena", photo: PHOTOS.elena },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Marco", photo: PHOTOS.marco },
    ],
    description:
      "Three sessions, intermediate group. Bring leathers, spare attention, and respect for the line.",
    privacy: "Invite",
    lat: 30.1328,
    lng: -97.6411,
    route: [
      { lat: 30.1328, lng: -97.6411 },
      { lat: 30.1304, lng: -97.6382 },
      { lat: 30.1287, lng: -97.6419 },
      { lat: 30.1318, lng: -97.6445 },
      { lat: 30.1328, lng: -97.6411 },
    ],
  },
  {
    id: "r4",
    name: "Hill Country Loop",
    date: "Sat May 31",
    time: "7:00 AM",
    meetPoint: "The Salt Lick BBQ",
    city: "Driftwood, TX",
    type: "Touring",
    distance: "240 mi",
    duration: "7h",
    cover:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=1200&h=900&fit=crop",
    host: { name: "Elena Ruiz", photo: PHOTOS.elena },
    going: [
      { name: "Roman", photo: PHOTOS.roman },
      { name: "Aiyana", photo: PHOTOS.aiyana },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Marco", photo: PHOTOS.marco },
      { name: "Devin", photo: PHOTOS.devin },
    ],
    description:
      "A long loop through limestone and silence. Two scenic stops, sunset finish, no rushing the road.",
    privacy: "Open",
    lat: 30.1219,
    lng: -98.0353,
    route: [
      { lat: 30.1219, lng: -98.0353 },
      { lat: 30.19, lng: -98.086 },
      { lat: 30.248, lng: -98.169 },
      { lat: 30.292, lng: -98.305 },
      { lat: 30.22, lng: -98.19 },
    ],
  },
];

const PAST_SEED: Ride[] = [
  {
    id: "p1",
    name: "Galveston Coastal Run",
    date: "Sat May 10",
    time: "6:00 AM",
    meetPoint: "Seawall Boulevard",
    city: "Galveston, TX",
    type: "Touring",
    distance: "120 mi",
    duration: "4h",
    cover:
      "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=1200&h=900&fit=crop",
    previewImage:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&h=900&fit=crop",
    host: { name: "Roman Petrov", photo: PHOTOS.roman },
    going: [
      { name: "Marco", photo: PHOTOS.marco },
      { name: "Elena", photo: PHOTOS.elena },
    ],
    description:
      "Sunrise over the seawall. Easy pace, clean line, no wasted motion.",
    privacy: "Open",
    lat: 29.3013,
    lng: -94.7977,
    route: [
      { lat: 29.3013, lng: -94.7977 },
      { lat: 29.287, lng: -94.79 },
      { lat: 29.275, lng: -94.776 },
    ],
  },
];

const INITIAL_DRAFT: DraftRide = {
  name: "",
  date: "",
  time: "",
  meetPoint: "",
  city: "",
  type: "Night Run",
  description: "",
  privacy: "Open",
  lat: 30.2672,
  lng: -97.7431,
  route: [],
  previewImage: "",
};

function RouteCardMapPreview({ ride }: { ride: Ride }) {
  const route = ride.route?.length ? ride.route : [{ lat: ride.lat, lng: ride.lng }];
  const lats = route.map((point) => point.lat);
  const lngs = route.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.001);
  const lngRange = Math.max(maxLng - minLng, 0.001);
  const padding = 22;
  const width = 220;
  const height = 126;
  const points = route.map((point) => {
    const x = padding + ((point.lng - minLng) / lngRange) * (width - padding * 2);
    const y = height - padding - ((point.lat - minLat) / latRange) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const start = points[0];
  const end = points.at(-1) ?? start;

  return (
    <div className="relative flex h-full min-h-[176px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_35%_18%,rgba(127,17,27,0.22),transparent_36%),linear-gradient(135deg,#070606,#111014_52%,#050405)]">
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:28px_28px]" />
      <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="rgba(20,20,22,0.82)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="rgba(180,20,30,0.92)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="rgba(255,210,214,0.42)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={start.split(",")[0]} cy={start.split(",")[1]} r="5" fill="rgba(232,122,130,0.95)" />
        <circle cx={end.split(",")[0]} cy={end.split(",")[1]} r="5" fill="rgba(255,255,255,0.88)" />
      </svg>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-zinc-300 backdrop-blur-md">
          {ride.distance}
        </span>
        <span className="rounded-full border border-[#b4141e]/30 bg-[#b4141e]/15 px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-[#f1c3c7] backdrop-blur-md">
          Route Preview
        </span>
      </div>
    </div>
  );
}

export default function RidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past" | "hosted">("upcoming");
  const [going, setGoing] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingRsvp, setPendingRsvp] = useState<string | null>(null);
  const [showHostForm, setShowHostForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [upcoming] = useState<Ride[]>(UPCOMING_SEED);
  const [past] = useState<Ride[]>(PAST_SEED);
  const [hosted, setHosted] = useState<Ride[]>([]);
  const [draftRide, setDraftRide] = useState<DraftRide>(INITIAL_DRAFT);
  const [liveRiders, setLiveRiders] = useState<LiveRidersState>({});

  const previousFocus = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingWatchRef = useRef<number | null>(null);
  const trackingRideRef = useRef<string | null>(null);
  const lastLocationWriteRef = useRef<Record<string, { lat: number; lng: number; at: number }>>({});
  const detailHistoryPushed = useRef(false);

  const allRides = useMemo(() => [...upcoming, ...past, ...hosted], [upcoming, past, hosted]);
  const list = tab === "upcoming" ? upcoming : tab === "past" ? past : hosted;
  const featuredRide = list[0] ?? null;
  const secondaryRides = featuredRide ? list.slice(1) : list;
  const openRide = openId ? allRides.find((r) => r.id === openId) ?? null : null;

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pendingRsvp) setPendingRsvp(null);
        else if (showHostForm) setShowHostForm(false);
        else if (openId) setOpenId(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, pendingRsvp, showHostForm]);

  useEffect(() => {
    const onPopState = () => {
      if (detailHistoryPushed.current) {
        detailHistoryPushed.current = false;
        dismissDetails();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    return () => {
      if (trackingWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(trackingWatchRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!openRide?.id) return;

    const rideId = openRide.id;
    let isMounted = true;

    async function loadInitialLiveRiders() {
      const { data, error } = await supabase
        .from("ride_live_locations")
        .select("ride_id, user_id, rider_name, rider_photo, lat, lng")
        .eq("ride_id", rideId);

      if (error) {
        console.error("Failed loading live riders:", error.message);
        return;
      }

      if (!isMounted) return;

      setLiveRiders((prev) => ({
        ...prev,
        [rideId]: (data ?? []) as LiveRideRider[],
      }));
    }

    loadInitialLiveRiders();

    const channel = supabase
      .channel(`ride-live-${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ride_live_locations",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          setLiveRiders((prev) => {
            const current = prev[rideId] ?? [];

            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as LiveRiderRow;
              return {
                ...prev,
                [rideId]: current.filter((r) => r.user_id !== oldRow.user_id),
              };
            }

            const nextRow = payload.new as LiveRiderRow;
            const withoutSameUser = current.filter((r) => r.user_id !== nextRow.user_id);

            return {
              ...prev,
              [rideId]: [...withoutSameUser, nextRow],
            };
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [openRide?.id]);

  const pushToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  async function getCurrentUserProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      user,
      rider_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.username ||
        user.email ||
        "Rider",
      rider_photo: user.user_metadata?.avatar_url || null,
    };
  }

  async function writeLiveLocation(
    rideId: string,
    lat: number,
    lng: number,
    riderName: string,
    riderPhoto: string | null,
    userId: string
  ) {
    const { error } = await supabase.from("ride_live_locations").upsert(
      {
        ride_id: rideId,
        user_id: userId,
        rider_name: riderName,
        rider_photo: riderPhoto,
        lat,
        lng,
      },
      { onConflict: "ride_id,user_id" }
    );

    if (error) {
      console.error("Failed writing live location:", error.message);
    }
  }

  function shouldWriteLiveLocation(rideId: string, lat: number, lng: number) {
    const previous = lastLocationWriteRef.current[rideId];
    const now = Date.now();

    if (!previous) {
      lastLocationWriteRef.current[rideId] = { lat, lng, at: now };
      return true;
    }

    const elapsed = now - previous.at;
    const moved =
      Math.abs(previous.lat - lat) > 0.0003 || Math.abs(previous.lng - lng) > 0.0003;

    if (elapsed >= 15000 || moved) {
      lastLocationWriteRef.current[rideId] = { lat, lng, at: now };
      return true;
    }

    return false;
  }

  async function startRideTracking(rideId: string) {
    const profile = await getCurrentUserProfile();

    if (!profile || !navigator.geolocation) {
      console.warn("No user or geolocation unavailable");
      return;
    }

    trackingRideRef.current = rideId;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await writeLiveLocation(
          rideId,
          position.coords.latitude,
          position.coords.longitude,
          profile.rider_name,
          profile.rider_photo,
          profile.user.id
        );
      },
      (error) => {
        console.error("Initial geolocation failed:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    if (trackingWatchRef.current !== null) {
      navigator.geolocation.clearWatch(trackingWatchRef.current);
    }

    trackingWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        if (!trackingRideRef.current) return;
        if (
          !shouldWriteLiveLocation(
            trackingRideRef.current,
            position.coords.latitude,
            position.coords.longitude
          )
        ) {
          return;
        }

        await writeLiveLocation(
          trackingRideRef.current,
          position.coords.latitude,
          position.coords.longitude,
          profile.rider_name,
          profile.rider_photo,
          profile.user.id
        );
      },
      (error) => {
        console.error("Live tracking failed:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }

  async function stopRideTracking(rideId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (trackingWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(trackingWatchRef.current);
      trackingWatchRef.current = null;
    }

    trackingRideRef.current = null;

    if (!user) return;

    const { error } = await supabase
      .from("ride_live_locations")
      .delete()
      .eq("ride_id", rideId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed removing live location:", error.message);
    }
  }

  const confirmRsvp = async (id: string) => {
    const nextGoing = !going[id];

    setGoing((g) => ({ ...g, [id]: nextGoing }));

    if (nextGoing) {
      await startRideTracking(id);
      pushToast("Your seat is held. Added to the ride chat.");
    } else {
      await stopRideTracking(id);
      pushToast("RSVP withdrawn.");
    }

    setPendingRsvp(null);
  };

  const openHostSheet = () => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    setShowHostForm(true);
  };

  const closeHostSheet = () => {
    setShowHostForm(false);
    previousFocus.current?.focus?.();
  };

  const openDetails = (id: string) => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    if (typeof window !== "undefined" && !detailHistoryPushed.current) {
      window.history.pushState({ crimsonRideDetail: id }, "", window.location.href);
      detailHistoryPushed.current = true;
    }
    setOpenId(id);
  };

  function dismissDetails() {
    setOpenId(null);
    previousFocus.current?.focus?.();
  }

  const closeDetails = () => {
    if (detailHistoryPushed.current) {
      router.back();
      return;
    }
    dismissDetails();
  };

  const backFromDetails = () => {
    if (detailHistoryPushed.current) {
      router.back();
      return;
    }
    router.push("/rides");
  };

  const updateDraft = <K extends keyof DraftRide>(key: K, value: DraftRide[K]) => {
    setDraftRide((d) => ({ ...d, [key]: value }));
  };

  const handlePostRide = () => {
    const hostName = "You";
    const hostPhoto = PHOTOS.marco;

    const newRide: Ride = {
      id: `h-${Date.now()}`,
      name: draftRide.name || "Untitled Run",
      date: draftRide.date
        ? new Date(`${draftRide.date}T00:00:00`)
            .toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
            .replace(",", "")
        : "Date TBD",
      time: draftRide.time || "Time TBD",
      meetPoint: draftRide.meetPoint || "Meet point TBD",
      city: draftRide.city || "Location TBD",
      type: draftRide.type,
      distance: draftRide.route.length > 1 ? "Route set" : "TBD",
      duration: "TBD",
      cover:
        draftRide.previewImage ||
        "https://images.unsplash.com/photo-1517846693594-1567da72af75?w=1200&h=900&fit=crop",
      previewImage: draftRide.previewImage || undefined,
      host: { name: hostName, photo: hostPhoto },
      going: [],
      description:
        draftRide.description ||
        "A new run has been posted. Route and details are set by the host.",
      privacy: draftRide.privacy,
      lat: draftRide.lat,
      lng: draftRide.lng,
      route: draftRide.route,
    };

    setHosted((prev) => [newRide, ...prev]);
    setTab("hosted");
    setDraftRide(INITIAL_DRAFT);
    closeHostSheet();
    pushToast("Ride posted to the ledger.");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%), radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%), linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(127,17,27,0.84)] to-transparent"
      />

      <div className="relative mx-auto max-w-[1180px] px-5 pb-28 pt-8 sm:px-8 sm:pt-10">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            The Ledger
          </div>
          <button
            onClick={openHostSheet}
            className="rounded-full border border-[rgba(255,255,255,0.24)] bg-[rgba(255,255,255,0.02)] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-100 transition duration-200 hover:border-[rgba(127,17,27,0.55)] hover:bg-[rgba(127,17,27,0.16)]"
          >
            Host Ride
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
          {[
            { k: "upcoming", label: "UPCOMING" },
            { k: "past", label: "PAST" },
            { k: "hosted", label: "HOSTED" },
          ].map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k as typeof tab)}
                className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition duration-200 ${
                  active
                    ? "border-[rgba(127,17,27,0.72)] bg-[rgba(127,17,27,0.42)] text-[#f4d7db] shadow-[0_0_0_1px_rgba(127,17,27,0.18)_inset]"
                    : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.015)] text-zinc-400 hover:border-[rgba(127,17,27,0.34)] hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <section className="px-2 pb-3 pt-8 text-center sm:px-10 sm:pt-10">
          <div className="mx-auto flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-white/20" />
            <span className="text-xl text-[#b4141e]">✦</span>
            <span className="h-px w-12 bg-white/20" />
          </div>

          <h1 className="mt-5 font-serif text-5xl leading-none sm:text-7xl">Rides</h1>

          <div className="mt-3">
            <p className="font-serif text-[28px] italic leading-[1.08] text-[#e87a82] sm:text-[32px]">
              Curated routes, disciplined company.
            </p>

            <p className="mx-auto mt-2 max-w-2xl text-[15px] font-normal leading-[1.55] text-zinc-400 sm:text-[16px]">
              A clearer line between invitation and chaos.
            </p>
          </div>
        </section>

        {featuredRide && (
          <section className="mt-8 overflow-hidden rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(127,17,27,0.08),rgba(255,255,255,0.02))] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
            <div className="relative h-[248px] w-full overflow-hidden sm:h-[320px]">
              <Image
                src={featuredRide.cover}
                alt={featuredRide.name}
                fill
                sizes="(max-width: 768px) 100vw, 1180px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050405] via-[#05040530] to-transparent" />
              <div className="absolute inset-0 ring-1 ring-inset ring-[rgba(255,255,255,0.08)]" />

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[rgba(255,255,255,0.16)] bg-black/30 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-zinc-100 backdrop-blur-md">
                  {featuredRide.type}
                </span>
                {featuredRide.privacy === "Invite" && (
                  <span className="rounded-full border border-[rgba(127,17,27,0.52)] bg-[rgba(127,17,27,0.22)] px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[#f3d1d6] backdrop-blur-md">
                    Invite
                  </span>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                <p className="text-[9px] uppercase tracking-[0.26em] text-[rgba(229,112,126,0.84)]">
                  Featured Run
                </p>
                <h2 className="mt-2.5 max-w-3xl font-serif text-[34px] leading-none text-[#f5f1eb] sm:text-[48px]">
                  {featuredRide.name}
                </h2>
                <p className="mt-3 text-[10px] uppercase tracking-[0.19em] text-zinc-300">
                  {featuredRide.date} · {featuredRide.time}
                </p>
                <p className="mt-1.5 text-[13px] tracking-[0.12em] text-zinc-400 sm:text-[14px]">
                  {featuredRide.distance} · {featuredRide.duration} · {featuredRide.meetPoint}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
              <p className="max-w-2xl text-[14px] leading-6 text-zinc-300">
                {featuredRide.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {tab !== "past" && (
                  <button
                    onClick={() => setPendingRsvp(featuredRide.id)}
                    className={`rounded-full border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] transition duration-200 ${
                      going[featuredRide.id]
                        ? "border-[rgba(127,17,27,0.82)] bg-[rgba(127,17,27,0.28)] text-[#f4dadd]"
                        : "border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.03)] text-zinc-100 hover:border-[rgba(127,17,27,0.45)] hover:bg-[rgba(127,17,27,0.16)]"
                    }`}
                  >
                    {going[featuredRide.id] ? "Going" : "JOIN RIDE"}
                  </button>
                )}

                <button
                  onClick={() => openDetails(featuredRide.id)}
                  className="rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.02)] px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-zinc-100 transition duration-200 hover:border-[rgba(127,17,27,0.4)] hover:bg-[rgba(127,17,27,0.12)]"
                >
                  Details
                </button>
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="mt-8 flex items-center justify-between gap-4 px-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {list.length} {list.length === 1 ? "ride" : "rides"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
              Curated selection
            </p>
          </div>

          <ul className="mt-4 space-y-4">
            {secondaryRides.map((r) => {
              const isGoing = !!going[r.id];
              const totalGoing = r.going.length + (isGoing ? 1 : 0);

              return (
                <li
                  key={r.id}
                  className="overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(127,17,27,0.07),rgba(255,255,255,0.02))]"
                >
                  <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                    <div className="relative h-[176px] w-full overflow-hidden md:h-full">
                      {r.previewImage ? (
                        <Image
                          src={r.previewImage}
                          alt={`${r.name} preview`}
                          fill
                          sizes="(max-width: 768px) 100vw, 220px"
                          className="object-cover"
                        />
                      ) : (
                        <RouteCardMapPreview ride={r} />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#05040580] via-transparent to-transparent" />
                      <div className="absolute left-4 top-4 rounded-full border border-[rgba(255,255,255,0.16)] bg-black/30 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-zinc-100 backdrop-blur-md">
                        {r.type}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                            {r.date} · {r.time}
                          </p>
                          <h3 className="mt-2.5 font-serif text-[26px] leading-none text-[#f4f0ea] sm:text-[28px]">
                            {r.name}
                          </h3>
                        </div>

                        <div className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-zinc-300">
                          {totalGoing} going
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-zinc-300 sm:text-sm">
                        <span>{r.meetPoint}</span>
                        <span className="text-zinc-700">•</span>
                        <span>{r.distance}</span>
                        <span className="text-zinc-700">•</span>
                        <span>{r.duration}</span>
                      </div>

                      <p className="mt-3.5 max-w-2xl text-[14px] leading-6 text-zinc-300">
                        {r.description}
                      </p>

                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            {r.going.slice(0, 4).map((g, i) => (
                              <div
                                key={g.name}
                                className="relative h-8 w-8 overflow-hidden rounded-full border border-[#120b0d]"
                                style={{ marginLeft: i === 0 ? 0 : -8 }}
                              >
                                <Image
                                  src={g.photo}
                                  alt={g.name}
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>

                          <div>
                            <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                              Hosted by
                            </p>
                            <p className="text-xs text-zinc-300">{r.host.name}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {tab !== "past" ? (
                            <button
                              onClick={() => setPendingRsvp(r.id)}
                              className={`rounded-full border px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] transition duration-200 ${
                                isGoing
                                  ? "border-[rgba(127,17,27,0.82)] bg-[rgba(127,17,27,0.28)] text-[#f4dadd]"
                                  : "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.02)] text-zinc-100 hover:border-[rgba(127,17,27,0.42)] hover:bg-[rgba(127,17,27,0.14)]"
                              }`}
                            >
                              {isGoing ? "Going" : "JOIN RIDE"}
                            </button>
                          ) : null}

                          <button
                            onClick={() => openDetails(r.id)}
                            className="rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.02)] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-100 transition duration-200 hover:border-[rgba(127,17,27,0.42)] hover:bg-[rgba(127,17,27,0.12)]"
                          >
                            {tab === "past" ? "Recap" : "Details"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}

            {list.length === 0 && (
              <li className="rounded-[30px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(127,17,27,0.08),rgba(255,255,255,0.02))] p-12 text-center">
                <p className="font-serif text-3xl text-[#f3efe9]">
                  {tab === "hosted"
                    ? "You have not called a run yet."
                    : "Nothing has been entered into the book."}
                </p>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400">
                  {tab === "hosted"
                    ? "Plot the line, set the terms, and call the company."
                    : "Check again when the next route is posted."}
                </p>
              </li>
            )}
          </ul>
        </section>
      </div>

      {openRide && (
        <div
          onClick={closeDetails}
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/82 px-4 py-6 backdrop-blur-md sm:items-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-6 w-full max-w-3xl overflow-hidden rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[#090709] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)]"
          >
            <button
              onClick={backFromDetails}
              aria-label="Back from ride details"
              className="absolute left-5 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-lg text-[#f4dadd] shadow-[0_12px_35px_-18px_rgba(0,0,0,0.95)] backdrop-blur-md transition hover:border-[rgba(127,17,27,0.5)] hover:text-white"
            >
              ←
            </button>

            <button
              onClick={closeDetails}
              aria-label="Close ride details"
              className="absolute right-5 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              ×
            </button>

            <div className="relative h-64 w-full overflow-hidden sm:h-80">
              <Image
                src={openRide.cover}
                alt={openRide.name}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090709] via-[#09070915] to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                  {openRide.date} · {openRide.time}
                </p>
                <h2 className="mt-3 font-serif text-4xl leading-none text-[#f4f0ea] sm:text-5xl">
                  {openRide.name}
                </h2>
                <p className="mt-3 text-sm text-zinc-300">{openRide.city}</p>
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              <div className="overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-black/40">
                <RideMap
                  lat={openRide.lat}
                  lng={openRide.lng}
                  meetPoint={openRide.meetPoint}
                  route={openRide.route ?? []}
                  riders={liveRiders[openRide.id] ?? []}
                  editable={false}
                  height={340}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Distance", value: openRide.distance },
                  { label: "Duration", value: openRide.duration },
                  {
                    label: "Going",
                    value: String(openRide.going.length + (going[openRide.id] ? 1 : 0)),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 text-center"
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-medium text-zinc-100">{item.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">The Run</p>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-300">
                  {openRide.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Riders Going
                  </p>
                  <p className="text-sm text-zinc-500">{openRide.going.length} confirmed</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-4">
                  {openRide.going.map((g) => (
                    <div key={g.name} className="flex flex-col items-center gap-2">
                      <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[rgba(127,17,27,0.35)]">
                        <Image
                          src={g.photo}
                          alt={g.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                        {g.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/messages/${openRide.id}`}
                  className="flex-1 rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.02)] py-3 text-center text-[11px] uppercase tracking-[0.18em] text-zinc-100 transition duration-200 hover:border-[rgba(127,17,27,0.42)] hover:bg-[rgba(127,17,27,0.12)]"
                >
                  Group Chat
                </Link>

                {tab !== "past" && (
                  <button
                    onClick={() => setPendingRsvp(openRide.id)}
                    className={`flex-1 rounded-full border py-3 text-[11px] uppercase tracking-[0.18em] transition duration-200 ${
                      going[openRide.id]
                        ? "border-[rgba(127,17,27,0.82)] bg-[rgba(127,17,27,0.28)] text-[#f4dadd]"
                        : "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.02)] text-zinc-100 hover:border-[rgba(127,17,27,0.42)] hover:bg-[rgba(127,17,27,0.14)]"
                    }`}
                  >
                    {going[openRide.id] ? "Going" : "JOIN RIDE"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingRsvp && (
        <div
          onClick={() => setPendingRsvp(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/86 px-6 backdrop-blur-md"
          aria-modal="true"
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[30px] border border-[rgba(255,255,255,0.08)] bg-[#090709] p-7 text-center shadow-[0_25px_60px_-25px_rgba(0,0,0,0.92)]"
          >
            <div className="mx-auto flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-white/15" />
              <span className="text-[rgba(127,17,27,0.95)]">✦</span>
              <span className="h-px w-8 bg-white/15" />
            </div>

            <h3 className="mt-5 font-serif text-3xl text-[#f3efe9]">
              {going[pendingRsvp] ? "Withdraw your seat?" : "Confirm your place?"}
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {going[pendingRsvp]
                ? "You will be removed from the ride and the private chat."
                : "You will be added to the ride roster and the private chat."}
            </p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setPendingRsvp(null)}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.02] py-3 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition duration-200 hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmRsvp(pendingRsvp)}
                className="flex-1 rounded-full border border-[rgba(127,17,27,0.82)] bg-[rgba(127,17,27,0.22)] py-3 text-[11px] uppercase tracking-[0.18em] text-[#f4dadd] transition duration-200 hover:bg-[rgba(127,17,27,0.28)]"
              >
                {going[pendingRsvp] ? "Withdraw" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHostForm && (
        <div
          onClick={closeHostSheet}
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/82 px-4 py-6 backdrop-blur-md sm:items-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-6 w-full max-w-3xl rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[#090709] p-5 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] sm:p-6"
          >
            <button
              onClick={closeHostSheet}
              aria-label="Close host ride form"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              ×
            </button>

            <div className="pr-10">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-white/12" />
                <span className="text-[rgba(127,17,27,0.95)]">✦</span>
                <span className="h-px w-8 bg-white/12" />
              </div>

              <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Call the Run
              </p>
              <h2 className="mt-3 font-serif text-4xl text-[#f3efe9] sm:text-5xl">
                Host a Ride
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Set the terms, mark the meet point, and draw the route so every rider knows
                the line before the engines turn.
              </p>
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-[1.05fr_1.2fr]">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    Ride name
                  </label>
                  <input
                    value={draftRide.name}
                    onChange={(e) => updateDraft("name", e.target.value)}
                    placeholder="Midnight cathedral run"
                    className="w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[rgba(127,17,27,0.55)] focus:ring-2 focus:ring-[rgba(127,17,27,0.18)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                      Date
                    </label>
                    <input
                      type="date"
                      value={draftRide.date}
                      onChange={(e) => updateDraft("date", e.target.value)}
                      className="w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[rgba(127,17,27,0.55)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                      Time
                    </label>
                    <input
                      type="time"
                      value={draftRide.time}
                      onChange={(e) => updateDraft("time", e.target.value)}
                      className="w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[rgba(127,17,27,0.55)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    Meet point
                  </label>
                  <input
                    value={draftRide.meetPoint}
                    onChange={(e) => updateDraft("meetPoint", e.target.value)}
                    placeholder="Address or landmark"
                    className="w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[rgba(127,17,27,0.55)] focus:ring-2 focus:ring-[rgba(127,17,27,0.18)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    City
                  </label>
                  <input
                    value={draftRide.city}
                    onChange={(e) => updateDraft("city", e.target.value)}
                    placeholder="Austin, TX"
                    className="w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[rgba(127,17,27,0.55)] focus:ring-2 focus:ring-[rgba(127,17,27,0.18)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    Preview image
                  </label>
                  <input
                    value={draftRide.previewImage}
                    onChange={(e) => updateDraft("previewImage", e.target.value)}
                    placeholder="Paste an image URL of riders, bikes, or the mood of the run"
                    className="w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[rgba(127,17,27,0.55)] focus:ring-2 focus:ring-[rgba(127,17,27,0.18)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    Ride type
                  </label>
                  <select
                    value={draftRide.type}
                    onChange={(e) => updateDraft("type", e.target.value as RideType)}
                    className="w-full appearance-none rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[rgba(127,17,27,0.55)]"
                  >
                    <option className="bg-[#0b0b0c]">Night Run</option>
                    <option className="bg-[#0b0b0c]">Canyon Run</option>
                    <option className="bg-[#0b0b0c]">Touring</option>
                    <option className="bg-[#0b0b0c]">Track Day</option>
                    <option className="bg-[#0b0b0c]">Group Ride</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={draftRide.description}
                    onChange={(e) => updateDraft("description", e.target.value)}
                    placeholder="Set the mood, the pace, the stops, and the expectations."
                    className="w-full resize-none rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm leading-6 text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[rgba(127,17,27,0.55)] focus:ring-2 focus:ring-[rgba(127,17,27,0.18)]"
                  />
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    Access
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateDraft("privacy", "Open")}
                      className={`rounded-[18px] border px-4 py-3 text-[11px] uppercase tracking-[0.18em] transition ${
                        draftRide.privacy === "Open"
                          ? "border-[rgba(127,17,27,0.82)] bg-[rgba(127,17,27,0.22)] text-[#f4dadd]"
                          : "border-[rgba(255,255,255,0.08)] text-zinc-400 hover:border-[rgba(127,17,27,0.32)]"
                      }`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraft("privacy", "Invite")}
                      className={`rounded-[18px] border px-4 py-3 text-[11px] uppercase tracking-[0.18em] transition ${
                        draftRide.privacy === "Invite"
                          ? "border-[rgba(127,17,27,0.82)] bg-[rgba(127,17,27,0.22)] text-[#f4dadd]"
                          : "border-[rgba(255,255,255,0.08)] text-zinc-400 hover:border-[rgba(127,17,27,0.32)]"
                      }`}
                    >
                      Invite Only
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                      Plot the line
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">
                      Click once to set the meet point, then keep clicking to draw the route.
                    </p>
                  </div>
                  <div className="text-right text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    {draftRide.route.length} route points
                  </div>
                </div>

                <div className="overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-black/40">
                  <RideMap
                    lat={draftRide.lat}
                    lng={draftRide.lng}
                    meetPoint={draftRide.meetPoint || "Meet point"}
                    route={draftRide.route}
                    editable
                    height={420}
                    onMeetPointChange={(point) => {
                      updateDraft("lat", point.lat);
                      updateDraft("lng", point.lng);
                    }}
                    onRouteChange={(route) => updateDraft("route", route)}
                  />
                </div>

                <div className="mt-3 rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    Host controls
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateDraft("route", [])}
                      className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-[rgba(127,17,27,0.32)]"
                    >
                      Clear route
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft(
                          "route",
                          draftRide.route.slice(0, Math.max(0, draftRide.route.length - 1))
                        )
                      }
                      className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-[rgba(127,17,27,0.32)]"
                    >
                      Remove last point
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateDraft("lat", 30.2672);
                        updateDraft("lng", -97.7431);
                        updateDraft("route", []);
                      }}
                      className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-[rgba(127,17,27,0.32)]"
                    >
                      Reset map
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-zinc-400">
                    The route appears as a live crimson line. Riders will see this same path
                    inside the detail sheet before they RSVP.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={closeHostSheet}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.02] py-3.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition duration-200 hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handlePostRide}
                className="flex-1 rounded-full border border-[rgba(127,17,27,0.82)] bg-[rgba(127,17,27,0.22)] py-3.5 text-[11px] uppercase tracking-[0.18em] text-[#f4dadd] transition duration-200 hover:bg-[rgba(127,17,27,0.28)]"
              >
                Post the Ride
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-1/2 z-[70] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-[rgba(127,17,27,0.28)] bg-[linear-gradient(180deg,rgba(127,17,27,0.2),rgba(11,11,12,0.95))] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-zinc-100 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.95)] backdrop-blur-md">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgba(127,17,27,0.95)]" />
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}
