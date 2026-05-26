"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { RideDetailsModal } from "@/components/rides/RideDetailsModal";
import { HostRideModal } from "@/components/rides/HostRideModal";

export type RideType = "Night Run" | "Track Day" | "Touring" | "Group Ride" | "Canyon Run";
export type RidePrivacy = "Open" | "Invite";

export type Rider = {
  name: string;
  photo: string;
};

export type Ride = {
  id: string;
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
};

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

const UPCOMING_RIDES: Ride[] = [
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
    going: [
      { name: "Elena", photo: PHOTOS.elena },
      { name: "Devin", photo: PHOTOS.devin },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Roman", photo: PHOTOS.roman },
    ],
    description:
      "Dawn meet, full tank, no stops till the gorge. Pace is measured and the line stays clean.",
    privacy: "Open",
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
    cover:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=900&fit=crop",
    host: { name: "Aiyana Cross", photo: PHOTOS.aiyana },
    going: [
      { name: "Marco", photo: PHOTOS.marco },
      { name: "Roman", photo: PHOTOS.roman },
    ],
    description: "Cold air, clean lines, no theater. Finish over coffee.",
    privacy: "Open",
  },
  {
    id: "r3",
    name: "Track Day COTA",
    date: "Sat Jun 7",
    time: "8:00 AM",
    meetPoint: "COTA Paddock B",
    destination: "Circuit of the Americas",
    city: "Austin, TX",
    type: "Track Day",
    distance: "Circuit",
    duration: "Full day",
    cover:
      "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=1200&h=900&fit=crop",
    host: { name: "Devin Cole", photo: PHOTOS.devin },
    going: [
      { name: "Elena", photo: PHOTOS.elena },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Marco", photo: PHOTOS.marco },
    ],
    description: "Three sessions, intermediate group. Bring leathers and respect for the line.",
    privacy: "Invite",
  },
  {
    id: "r4",
    name: "Hill Country Loop",
    date: "Sat Jun 14",
    time: "7:00 AM",
    meetPoint: "The Salt Lick BBQ",
    destination: "Enchanted Rock State Park",
    city: "Driftwood, TX",
    type: "Touring",
    distance: "240 mi",
    duration: "7h",
    cover:
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?w=1200&h=900&fit=crop",
    host: { name: "Elena Ruiz", photo: PHOTOS.elena },
    going: [
      { name: "Roman", photo: PHOTOS.roman },
      { name: "Aiyana", photo: PHOTOS.aiyana },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Marco", photo: PHOTOS.marco },
      { name: "Devin", photo: PHOTOS.devin },
    ],
    description: "A long loop through limestone and silence. Scenic stops, sunset finish.",
    privacy: "Open",
  },
];

function RideCard({
  isGoing,
  onJoin,
  onViewDetails,
  ride,
}: {
  isGoing: boolean;
  onJoin: () => void;
  onViewDetails: () => void;
  ride: Ride;
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
                {ride.date} / {ride.time}
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

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{ride.description}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center">
              {ride.going.slice(0, 4).map((rider, index) => (
                <div
                  key={rider.name}
                  className="relative h-8 w-8 overflow-hidden rounded-full border border-[#120b0d]"
                  style={{ marginLeft: index === 0 ? 0 : -8 }}
                >
                  <Image src={rider.photo} alt={rider.name} fill sizes="32px" className="object-cover" />
                </div>
              ))}
              <span className="ml-3 text-xs text-zinc-500">
                {ride.going.length + (isGoing ? 1 : 0)} going
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onViewDetails}
                className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
              >
                View Route
              </button>
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
  const [going, setGoing] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showHostModal, setShowHostModal] = useState(false);

  const featuredRide = UPCOMING_RIDES[0];
  const compactRides = UPCOMING_RIDES.slice(1);

  function toggleJoin(rideId: string) {
    setGoing((current) => {
      const nextGoing = !current[rideId];
      setToast(nextGoing ? "Ride joined." : "Ride left.");
      window.setTimeout(() => setToast(null), 2000);
      return { ...current, [rideId]: nextGoing };
    });
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(127,17,27,0.84)] to-transparent"
      />

      <div className="relative mx-auto max-w-[1080px] px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+28px)] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">Ride Ledger</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHostModal(true)}
              className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.07]"
            >
              + Host Ride
            </button>
            <Link
              href="/rides/track"
              className="rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/24 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd] transition hover:bg-[#7f111b]/34"
            >
              Start Ride Tracking
            </Link>
          </div>
        </div>

        <header className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#d85f6c]">
            Featured Rides
          </p>
          <h1 className="mt-3 font-serif text-[46px] leading-none text-[#f4f0ea] sm:text-7xl">
            Rides
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Curated routes, disciplined company, and one clean line into live ride tracking.
          </p>
        </header>

        {/* Featured Ride */}
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
                {featuredRide.date} / {featuredRide.time}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {featuredRide.distance} / {featuredRide.duration} / {featuredRide.meetPoint}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="max-w-2xl text-sm leading-6 text-zinc-300">{featuredRide.description}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRide(featuredRide)}
                className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
              >
                View Route / Details
              </button>
              <button
                type="button"
                onClick={() => toggleJoin(featuredRide.id)}
                className={`rounded-lg border px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition ${
                  going[featuredRide.id]
                    ? "border-[#7f111b]/80 bg-[#7f111b]/24 text-[#f4dadd]"
                    : "border-white/15 bg-white/[0.02] text-zinc-100 hover:border-[#7f111b]/60 hover:bg-[#7f111b]/16"
                }`}
              >
                {going[featuredRide.id] ? "Going" : "JOIN RIDE"}
              </button>
            </div>
          </div>
        </section>

        {/* Upcoming Rides */}
        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              Upcoming Rides
            </p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
              {UPCOMING_RIDES.length} listed
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {compactRides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                isGoing={!!going[ride.id]}
                onJoin={() => toggleJoin(ride.id)}
                onViewDetails={() => setSelectedRide(ride)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Modals */}
      {selectedRide && (
        <RideDetailsModal
          ride={selectedRide}
          isGoing={!!going[selectedRide.id]}
          onJoin={() => toggleJoin(selectedRide.id)}
          onClose={() => setSelectedRide(null)}
        />
      )}

      {showHostModal && (
        <HostRideModal
          onClose={() => setShowHostModal(false)}
          onCreate={(newRide) => {
            // TODO: persist to Supabase in Phase 2
            setShowHostModal(false);
            setToast("Ride created!");
            window.setTimeout(() => setToast(null), 2500);
            console.log("New ride draft:", newRide);
          }}
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
