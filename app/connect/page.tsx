"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type Status = "none" | "pending" | "connected";

type Member = {
  id: string;
  handle: string;
  name: string;
  city: string;
  bike: string;
  style: string[];
  rides: number;
  photo: string;
  bio: string;
};

const MEMBERS: Member[] = [
  {
    id: "m1",
    handle: "@nightrider",
    name: "Marco Vélez",
    city: "Austin, TX",
    bike: "Ducati Panigale V4",
    style: ["Track"],
    rides: 47,
    photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=faces",
    bio: "Canyon runs after midnight. Apex hunter.",
  },
  {
    id: "m2",
    handle: "@ironsaint",
    name: "Elena Ruiz",
    city: "Los Angeles, CA",
    bike: "Triumph Speed Triple",
    style: ["Street", "Touring"],
    rides: 63,
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces",
    bio: "PCH regular. Coffee before sunrise.",
  },
  {
    id: "m3",
    handle: "@blackmass",
    name: "Devin Cole",
    city: "Brooklyn, NY",
    bike: "BMW S1000RR",
    style: ["Track", "Street"],
    rides: 29,
    photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop&crop=faces",
    bio: "Two wheels. One law: throttle.",
  },
  {
    id: "m4",
    handle: "@savagegrace",
    name: "Aiyana Cross",
    city: "Denver, CO",
    bike: "KTM 890 Duke R",
    style: ["Stunt", "Street"],
    rides: 38,
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=faces",
    bio: "Stoppies in empty lots. Smoke and silence.",
  },
  {
    id: "m5",
    handle: "@longshadow",
    name: "Roman Petrov",
    city: "Chicago, IL",
    bike: "Harley Fat Bob",
    style: ["Cruiser", "Touring"],
    rides: 81,
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces",
    bio: "Cross-country. One bag. No plan.",
  },
  {
    id: "m6",
    handle: "@redveil",
    name: "Sofia Marín",
    city: "Miami, FL",
    bike: "Aprilia RSV4",
    style: ["Track"],
    rides: 52,
    photo: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=400&fit=crop&crop=faces",
    bio: "Italian iron. Last lap energy.",
  },
];

const FILTERS = ["All", "Street", "Track", "Touring", "Stunt", "Cruiser"];

export default function ConnectPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const handleConnect = (id: string) => {
    setStatuses((s) => ({ ...s, [id]: s[id] === "pending" ? "connected" : "pending" }));
  };

  const filtered = MEMBERS.filter((m) => {
    const matchesFilter = filter === "All" || m.style.includes(filter);
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.handle.toLowerCase().includes(q) ||
      m.city.toLowerCase().includes(q) ||
      m.bike.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const openMember = openId ? MEMBERS.find((m) => m.id === openId) ?? null : null;

  return (
     <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
            radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%),
            linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)
          `,
      }}
    />
      <div className="relative mx-auto max-w-3xl px-6 pt-12 pb-20">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm uppercase tracking-[0.3em] text-zinc-500 transition hover:text-[#e87a82]"
          >
            ← Return
          </Link>
          <span className="text-xs uppercase tracking-[0.4em] text-zinc-600">
            Pillar I
          </span>
        </div>

        {/* Header */}
        <header className="mt-10 text-center">
          <div className="mx-auto flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-white/20" />
            <span className="text-[#b4141e] text-xl">✦</span>
            <span className="h-px w-12 bg-white/20" />
          </div>
          <h1 className="mt-6 font-serif text-7xl leading-none">Connect</h1>
          <p className="mt-4 font-serif italic text-3xl text-[#e87a82]">
            Find riders near you.
          </p>
          <p className="mx-auto font-serif text-[17px] text-bg-white/20 leading-relaxed">
            Browse the Order. Request a ride. Build your inner circle.
          </p>
        </header>

        {/* Search */}
        <div className="mt-12">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or city"
            className="w-full rounded-full border border-white/10 bg-white/[0.03] px-6 py-4 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20 transition"
          />
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-5 py-2 text-sm uppercase tracking-[0.25em] transition ${
                  active
                    ? "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
                    : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-zinc-300"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Count */}
        <p className="mt-10 text-sm uppercase tracking-[0.4em] text-zinc-500">
          {filtered.length} {filtered.length === 1 ? "Rider" : "Riders"}
        </p>

        {/* Members */}
        <ul className="mt-5 space-y-4">
          {filtered.map((m) => {
            const status = statuses[m.id] ?? "none";
            return (
              <li
                key={m.id}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-6 transition hover:border-white/20"
              >
                <div className="flex items-center gap-5">
                  {/* Avatar photo */}
                  <button
                    onClick={() => setOpenId(m.id)}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/50 shadow-[0_0_24px_-6px_rgba(180,20,30,0.6)] transition hover:scale-105"
                  >
                    <Image
                      src={m.photo}
                      alt={m.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>

                  {/* Info */}
                  <button
                    onClick={() => setOpenId(m.id)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-serif text-3xl leading-tight">{m.name}</h3>
                    <p className="mt-1 text-sm uppercase tracking-[0.25em] text-zinc-500">
                      {m.handle} · {m.city}
                    </p>
                    <p className="mt-2 text-base text-zinc-400">{m.bike}</p>
                  </button>

                  {/* Connect button */}
                  <button
                    onClick={() => handleConnect(m.id)}
                    disabled={status === "connected"}
                    className={`shrink-0 rounded-full border px-5 py-2.5 text-xs uppercase tracking-[0.25em] transition ${
                      status === "connected"
                        ? "border-[#b4141e]/40 bg-[#b4141e]/10 text-[#e87a82] cursor-default"
                        : status === "pending"
                        ? "border-white/20 text-zinc-300 hover:border-white/40"
                        : "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] hover:bg-[#b4141e]/30"
                    }`}
                  >
                    {status === "connected"
                      ? "✓ Connected"
                      : status === "pending"
                      ? "Pending"
                      : "Connect"}
                  </button>
                </div>

                {/* Style tags */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {m.style.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-500"
                    >
                      {s}
                    </span>
                  ))}
                  <span className="ml-auto text-xs uppercase tracking-[0.3em] text-zinc-600">
                    {m.rides} Rides
                  </span>
                </div>
              </li>
            );
          })}

          {filtered.length === 0 && (
            <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-base text-zinc-500">No riders match. Try a different filter.</p>
            </li>
          )}
        </ul>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <div className="mx-auto h-px w-12 bg-white/10" />
          <p className="mt-5 text-xs uppercase tracking-[0.5em] text-zinc-600">
            © Crimson Society · MMXXVI
          </p>
        </footer>
      </div>

      {/* Member modal */}
      {openMember && (
        <div
          onClick={() => setOpenId(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#050505] p-8 sm:rounded-3xl"
          >
            <button
              onClick={() => setOpenId(null)}
              className="absolute right-5 top-5 text-zinc-500 hover:text-white text-2xl"
            >
              ×
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-[#b4141e]/60 shadow-[0_0_32px_-4px_rgba(180,20,30,0.7)]">
                <Image
                  src={openMember.photo}
                  alt={openMember.name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <h2 className="mt-6 font-serif text-5xl">{openMember.name}</h2>
              <p className="mt-2 text-sm uppercase tracking-[0.3em] text-zinc-500">
                {openMember.handle} · {openMember.city}
              </p>

              <div className="mt-5 flex items-center gap-4">
                <span className="h-px w-10 bg-white/20" />
                <span className="text-[#b4141e]">✦</span>
                <span className="h-px w-10 bg-white/20" />
              </div>

              <p className="mt-5 font-serif italic text-xl text-zinc-300">
                "{openMember.bio}"
              </p>

              <div className="mt-7 grid w-full grid-cols-2 gap-3 text-left">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Machine
                  </p>
                  <p className="mt-1.5 text-base text-zinc-200">{openMember.bike}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Rides
                  </p>
                  <p className="mt-1.5 text-base text-zinc-200">{openMember.rides}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {openMember.style.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-400"
                  >
                    {s}
                  </span>
                ))}
              </div>

                            <Link
                href={`/messages/${openMember.id}`}
                className="mt-8 w-full rounded-full border border-[#b4141e] bg-[#b4141e]/20 py-3.5 text-center text-sm uppercase tracking-[0.3em] text-[#e87a82] hover:bg-[#b4141e]/30 transition"
              >
                Message
              </Link>
              <button
                onClick={() => setOpenId(null)}
                className="mt-3 w-full rounded-full border border-white/10 py-3.5 text-sm uppercase tracking-[0.3em] text-zinc-400 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}