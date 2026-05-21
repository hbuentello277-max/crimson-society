"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";

const RideMap = dynamic(() => import("@/components/RideMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0a]">
      <p className="font-serif italic text-zinc-500">Loading the route…</p>
    </div>
  ),
});

type Ride = {
  id: string;
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  city: string;
  type: "Night Run" | "Track Day" | "Touring" | "Group Ride" | "Canyon Run";
  distance: string;
  duration: string;
  cover: string;
  host: { name: string; photo: string };
  going: { name: string; photo: string }[];
  description: string;
  privacy: "Open" | "Invite";
  lat: number;
  lng: number;
};

const PHOTOS = {
  marco: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces",
  elena: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces",
  devin: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces",
  aiyana: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
  roman: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
  sofia: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&h=200&fit=crop&crop=faces",
};

const UPCOMING: Ride[] = [
  {
    id: "r1",
    name: "Sunday Canyon Run",
    date: "Sun · May 24",
    time: "5:30 AM",
    meetPoint: "Buc-ee's, Katy",
    city: "Houston, TX",
    type: "Canyon Run",
    distance: "180 mi",
    duration: "5h",
    cover: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&h=600&fit=crop",
    host: { name: "Marco Vélez", photo: PHOTOS.marco },
    going: [
      { name: "Elena", photo: PHOTOS.elena },
      { name: "Devin", photo: PHOTOS.devin },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Roman", photo: PHOTOS.roman },
    ],
    description:
      "Dawn meet, full tank, no stops till the gorge. Pace is steady — bring water, your camera, and your patience for the lights out of Katy.",
    privacy: "Open",
    lat: 29.7858,
    lng: -95.8244,
  },
  {
    id: "r2",
    name: "Midnight on the Loop",
    date: "Fri · May 22",
    time: "11:00 PM",
    meetPoint: "Memorial Park",
    city: "Houston, TX",
    type: "Night Run",
    distance: "60 mi",
    duration: "1.5h",
    cover: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&h=600&fit=crop",
    host: { name: "Aiyana Cross", photo: PHOTOS.aiyana },
    going: [
      { name: "Marco", photo: PHOTOS.marco },
      { name: "Roman", photo: PHOTOS.roman },
    ],
    description:
      "Empty loop. Cold air. We move clean — no horseplay, no light running. After-ride coffee at Agora.",
    privacy: "Open",
    lat: 29.7642,
    lng: -95.4310,
  },
  {
    id: "r3",
    name: "Track Day · COTA",
    date: "Sat · Jun 7",
    time: "8:00 AM",
    meetPoint: "COTA Paddock B",
    city: "Austin, TX",
    type: "Track Day",
    distance: "—",
    duration: "Full day",
    cover: "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=900&h=600&fit=crop",
    host: { name: "Devin Cole", photo: PHOTOS.devin },
    going: [
      { name: "Elena", photo: PHOTOS.elena },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Marco", photo: PHOTOS.marco },
    ],
    description:
      "Three sessions, intermediate group. Bring leathers, two tires, and a calm head. Garage spots reserved.",
    privacy: "Invite",
    lat: 30.1328,
    lng: -97.6411,
  },
  {
    id: "r4",
    name: "Hill Country Loop",
    date: "Sat · May 31",
    time: "7:00 AM",
    meetPoint: "The Salt Lick BBQ",
    city: "Driftwood, TX",
    type: "Touring",
    distance: "240 mi",
    duration: "7h",
    cover: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=900&h=600&fit=crop",
    host: { name: "Elena Ruiz", photo: PHOTOS.elena },
    going: [
      { name: "Roman", photo: PHOTOS.roman },
      { name: "Aiyana", photo: PHOTOS.aiyana },
      { name: "Sofia", photo: PHOTOS.sofia },
      { name: "Marco", photo: PHOTOS.marco },
      { name: "Devin", photo: PHOTOS.devin },
    ],
    description:
      "BBQ start, two scenic stops, sunset finish on FM-337. Tank full, mind clear.",
    privacy: "Open",
    lat: 30.1219,
    lng: -98.0353,
  },
];

const PAST: Ride[] = [
  {
    id: "p1",
    name: "Galveston Coastal Run",
    date: "Sat · May 10",
    time: "6:00 AM",
    meetPoint: "Seawall Boulevard",
    city: "Galveston, TX",
    type: "Touring",
    distance: "120 mi",
    duration: "4h",
    cover: "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=900&h=600&fit=crop",
    host: { name: "Roman Petrov", photo: PHOTOS.roman },
    going: [
      { name: "Marco", photo: PHOTOS.marco },
      { name: "Elena", photo: PHOTOS.elena },
    ],
    description: "Sunrise on the seawall. Easy pace, clean line.",
    privacy: "Open",
    lat: 29.3013,
    lng: -94.7977,
  },
];

const HOSTED: Ride[] = [];

export default function RidesPage() {
  const [tab, setTab] = useState<"upcoming" | "past" | "hosted">("upcoming");
  const [going, setGoing] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingRsvp, setPendingRsvp] = useState<string | null>(null);
  const [showHostForm, setShowHostForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const list = tab === "upcoming" ? UPCOMING : tab === "past" ? PAST : HOSTED;
  const openRide = openId
    ? [...UPCOMING, ...PAST].find((r) => r.id === openId)
    : null;

  const confirmRsvp = (id: string) => {
    setGoing((g) => ({ ...g, [id]: !g[id] }));
    const wasGoing = !!going[id];
    setToast(wasGoing ? "RSVP cancelled" : "You're going. Added to group chat.");
    setTimeout(() => setToast(null), 2200);
    setPendingRsvp(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 40% at 50% -10%, rgba(180,20,30,0.20), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 pt-12 pb-28">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            The Calendar
          </span>
          <button
            onClick={() => setShowHostForm(true)}
            className="rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[#e87a82] hover:bg-[#b4141e]/30 transition"
          >
            + Host a Ride
          </button>
        </div>

        {/* Header */}
        <header className="mt-10 text-center">
          <div className="mx-auto flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-white/20" />
            <span className="text-[#b4141e] text-xl">✦</span>
            <span className="h-px w-12 bg-white/20" />
          </div>
          <h1 className="mt-6 font-serif text-7xl leading-none">Rides</h1>
          <p className="mt-4 font-serif italic text-3xl text-[#e87a82]">
            Curated routes. Sanctioned runs.
          </p>
        </header>

        {/* Tabs */}
        <div className="mt-10 flex gap-2 rounded-full border border-white/10 bg-white/[0.02] p-1">
          {[
            { k: "upcoming", label: "Upcoming" },
            { k: "past", label: "Past" },
            { k: "hosted", label: "Hosted" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as typeof tab)}
              className={`flex-1 rounded-full py-2.5 text-xs uppercase tracking-[0.3em] transition ${
                tab === t.k
                  ? "bg-[#b4141e]/30 text-[#e87a82]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Ride list */}
        <ul className="mt-6 space-y-5">
          {list.map((r) => {
            const isGoing = !!going[r.id];
            return (
              <li
                key={r.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]"
              >
                {/* Cover */}
                <div className="relative h-48 w-full overflow-hidden">
                  <Image src={r.cover} alt={r.name} fill sizes="(max-width: 768px) 100vw, 700px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                  <div className="absolute right-3 top-3 flex gap-2">
                    <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-zinc-200 backdrop-blur">
                      {r.type}
                    </span>
                    {r.privacy === "Invite" && (
                      <span className="rounded-full border border-[#b4141e]/60 bg-[#b4141e]/30 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[#e87a82] backdrop-blur">
                        Invite
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-300">
                      {r.date} · {r.time}
                    </p>
                    <h3 className="mt-1 font-serif text-3xl leading-none">{r.name}</h3>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
                    <span className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                        <path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      {r.meetPoint}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span>{r.distance}</span>
                    <span className="text-zinc-600">·</span>
                    <span>{r.duration}</span>
                  </div>

                  {/* Host + going */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-8 w-8 overflow-hidden rounded-full border border-[#b4141e]/40">
                        <Image src={r.host.photo} alt={r.host.name} fill sizes="32px" className="object-cover" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Hosted by</p>
                        <p className="text-sm text-zinc-200">{r.host.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {r.going.slice(0, 4).map((g, i) => (
                        <div
                          key={g.name}
                          className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-[#050505]"
                          style={{ marginLeft: i === 0 ? 0 : "-8px" }}
                        >
                          <Image src={g.photo} alt={g.name} fill sizes="28px" className="object-cover" />
                        </div>
                      ))}
                      {r.going.length > 4 && (
                        <span className="ml-2 text-xs text-zinc-500">+{r.going.length - 4}</span>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  {tab !== "past" && (
                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={() => setPendingRsvp(r.id)}
                        className={`flex-1 rounded-full border py-3 text-xs uppercase tracking-[0.3em] transition ${
                          isGoing
                            ? "border-[#b4141e] bg-[#b4141e]/30 text-[#e87a82]"
                            : "border-[#b4141e] bg-[#b4141e]/15 text-[#e87a82] hover:bg-[#b4141e]/25"
                        }`}
                      >
                        {isGoing ? "✓ Going" : "I'm Going"}
                      </button>
                      <button
                        onClick={() => setOpenId(r.id)}
                        className="flex-1 rounded-full border border-white/10 py-3 text-xs uppercase tracking-[0.3em] text-zinc-300 hover:border-white/30 transition"
                      >
                        Details
                      </button>
                    </div>
                  )}

                  {tab === "past" && (
                    <button
                      onClick={() => setOpenId(r.id)}
                      className="mt-5 w-full rounded-full border border-white/10 py-3 text-xs uppercase tracking-[0.3em] text-zinc-400 hover:border-white/30 transition"
                    >
                      View Recap
                    </button>
                  )}
                </div>
              </li>
            );
          })}

          {list.length === 0 && (
            <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
              <p className="font-serif italic text-xl text-zinc-400">
                {tab === "hosted"
                  ? "You haven't hosted a ride yet. Be the one who calls the run."
                  : "Nothing here yet."}
              </p>
            </li>
          )}
        </ul>
      </div>

      {/* RIDE DETAIL SHEET */}
      {openRide && (
        <div
          onClick={() => setOpenId(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-8 w-full max-w-lg rounded-t-3xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#050505] sm:rounded-3xl"
          >
            <button
              onClick={() => setOpenId(null)}
              className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-zinc-300 hover:text-white text-xl backdrop-blur"
            >
              ×
            </button>

            {/* Cover */}
            <div className="relative h-56 w-full overflow-hidden rounded-t-3xl">
              <Image src={openRide.cover} alt={openRide.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0d] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-300">
                  {openRide.date} · {openRide.time}
                </p>
                <h2 className="mt-1 font-serif text-4xl leading-none">{openRide.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{openRide.city}</p>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {/* Map */}
              <RideMap lat={openRide.lat} lng={openRide.lng} meetPoint={openRide.meetPoint} />

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Distance</p>
                  <p className="mt-1 font-serif text-xl">{openRide.distance}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Duration</p>
                  <p className="mt-1 font-serif text-xl">{openRide.duration}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Going</p>
                  <p className="mt-1 font-serif text-xl">{openRide.going.length + (going[openRide.id] ? 1 : 0)}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">The Run</p>
                <p className="mt-2 text-base leading-relaxed text-zinc-300">
                  {openRide.description}
                </p>
              </div>

              {/* Riders */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                  Riders Going ({openRide.going.length})
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {openRide.going.map((g) => (
                    <div key={g.name} className="flex flex-col items-center gap-1">
                      <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[#b4141e]/40">
                        <Image src={g.photo} alt={g.name} fill sizes="48px" className="object-cover" />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                        {g.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Link
                  href={`/messages/${openRide.id}`}
                  className="flex-1 rounded-full border border-white/10 py-3 text-center text-xs uppercase tracking-[0.3em] text-zinc-300 hover:border-[#b4141e]/60 hover:text-[#e87a82] transition"
                >
                  Group Chat
                </Link>
                <button
                  onClick={() => setPendingRsvp(openRide.id)}
                  className={`flex-1 rounded-full border py-3 text-xs uppercase tracking-[0.3em] transition ${
                    going[openRide.id]
                      ? "border-[#b4141e] bg-[#b4141e]/30 text-[#e87a82]"
                      : "border-[#b4141e] bg-[#b4141e]/15 text-[#e87a82] hover:bg-[#b4141e]/25"
                  }`}
                >
                  {going[openRide.id] ? "✓ Going" : "I'm Going"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RSVP CONFIRMATION */}
      {pendingRsvp && (
        <div
          onClick={() => setPendingRsvp(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm px-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#050505] p-7 text-center"
          >
            <div className="mx-auto flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-white/20" />
              <span className="text-[#b4141e]">✦</span>
              <span className="h-px w-8 bg-white/20" />
            </div>
            <h3 className="mt-4 font-serif text-3xl">
              {going[pendingRsvp] ? "Cancel RSVP?" : "Lock it in?"}
            </h3>
            <p className="mt-3 text-sm text-zinc-400">
              {going[pendingRsvp]
                ? "You'll be removed from the ride and the group chat."
                : "You'll be added to the group chat and the host will be notified."}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setPendingRsvp(null)}
                className="flex-1 rounded-full border border-white/10 py-3 text-xs uppercase tracking-[0.3em] text-zinc-300 hover:border-white/30 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmRsvp(pendingRsvp)}
                className="flex-1 rounded-full border border-[#b4141e] bg-[#b4141e]/25 py-3 text-xs uppercase tracking-[0.3em] text-[#e87a82] hover:bg-[#b4141e]/35 transition"
              >
                {going[pendingRsvp] ? "Cancel RSVP" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOST A RIDE FORM */}
      {showHostForm && (
        <div
          onClick={() => setShowHostForm(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-8 w-full max-w-md rounded-t-3xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#050505] p-7 sm:rounded-3xl"
          >
            <button
              onClick={() => setShowHostForm(false)}
              className="absolute right-5 top-5 text-zinc-500 hover:text-white text-2xl"
            >
              ×
            </button>

            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Call the Run</p>
              <h2 className="mt-3 font-serif text-4xl">Host a Ride</h2>
            </div>

            <div className="mt-7 space-y-4">
              <input
                placeholder="Ride name"
                className="w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20 transition"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:outline-none transition"
                />
                <input
                  type="time"
                  className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:outline-none transition"
                />
              </div>
              <input
                placeholder="Meet point (address or place)"
                className="w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20 transition"
              />
              <select className="w-full appearance-none rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 focus:border-[#b4141e]/60 focus:outline-none transition">
                <option className="bg-[#0c0c0d]">Type · Night Run</option>
                <option className="bg-[#0c0c0d]">Type · Canyon Run</option>
                <option className="bg-[#0c0c0d]">Type · Touring</option>
                <option className="bg-[#0c0c0d]">Type · Track Day</option>
                <option className="bg-[#0c0c0d]">Type · Group Ride</option>
              </select>
              <textarea
                rows={3}
                placeholder="The run · what's the vibe, the pace, the stops?"
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20 transition"
              />
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-xl border border-[#b4141e] bg-[#b4141e]/15 px-4 py-3 text-sm uppercase tracking-[0.25em] text-[#e87a82]">
                  Open
                </button>
                <button className="rounded-xl border border-white/10 px-4 py-3 text-sm uppercase tracking-[0.25em] text-zinc-400 hover:border-white/30 transition">
                  Invite Only
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setShowHostForm(false);
                setToast("Ride posted to the calendar.");
                setTimeout(() => setToast(null), 2200);
              }}
              className="mt-6 w-full rounded-full border border-[#b4141e] bg-[#b4141e]/25 py-3.5 text-sm uppercase tracking-[0.3em] text-[#e87a82] hover:bg-[#b4141e]/35 transition"
            >
              Post the Ride
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/60 bg-[#0c0c0d]/95 px-5 py-3 text-xs uppercase tracking-[0.3em] text-[#e87a82] shadow-[0_0_24px_-6px_rgba(180,20,30,0.7)] backdrop-blur">
          ✦ {toast}
        </div>
      )}
    </main>
  );
}