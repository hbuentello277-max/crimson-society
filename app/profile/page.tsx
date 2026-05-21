"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const MY_POSTS = [
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=600&fit=crop",
];

const SOCIALS = [
  {
    name: "Instagram",
    handle: "@hbuentello",
    href: "https://instagram.com/hbuentello",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    handle: "@hbuentello",
    href: "https://tiktok.com/@hbuentello",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M16 3v3.2a4.8 4.8 0 0 0 4.8 4.8V14a8 8 0 0 1-4.8-1.6V17a5 5 0 1 1-5-5v3.2a1.8 1.8 0 1 0 1.8 1.8V3H16z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    handle: "@hbuentello",
    href: "https://youtube.com/@hbuentello",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <rect x="2.5" y="6" width="19" height="12" rx="3" />
        <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<"posts" | "rides" | "saved">("posts");

  return (
 <>
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(180,20,30,0.25), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 pt-12 pb-28">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Your Profile
          </span>
          <Link
            href="/profile/setup"
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 hover:border-[#b4141e]/60 hover:text-[#e87a82] transition"
          >
            Edit
          </Link>
        </div>

        {/* Avatar + identity */}
        <div className="mt-8 flex flex-col items-center text-center">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border border-[#b4141e]/60 shadow-[0_0_40px_-6px_rgba(180,20,30,0.7)]">
            <Image
              src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=faces"
              alt="You"
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>

          <h1 className="mt-5 font-serif text-5xl leading-none">Hector Buentello</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-zinc-500">
            @hbuentello · Houston, TX
          </p>

          {/* Socials */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-zinc-400 hover:border-[#b4141e]/60 hover:text-[#e87a82] transition"
              >
                <span className="text-zinc-500 group-hover:text-[#e87a82] transition">
                  {s.icon}
                </span>
                <span className="text-[11px] uppercase tracking-[0.25em]">
                  {s.handle}
                </span>
              </a>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="h-px w-12 bg-white/20" />
            <span className="text-[#b4141e]">✦</span>
            <span className="h-px w-12 bg-white/20" />
          </div>

          <p className="mt-5 font-serif italic text-xl text-zinc-300 max-w-md">
            "Bound by the road. Kept by the code."
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Street", "Night", "Track"].map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-400"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { n: "62", label: "Rides" },
            { n: "148", label: "Connections" },
            { n: "23", label: "Posts" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4 text-center"
            >
              <p className="font-serif text-3xl">{s.n}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Machine */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">My Machine</p>
          <p className="mt-2 font-serif text-2xl">Ducati Panigale V4</p>
          <p className="mt-1 text-sm text-zinc-400">2023 · Crimson over Carbon</p>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 rounded-full border border-white/10 bg-white/[0.02] p-1">
          {[
            { k: "posts", label: "Posts" },
            { k: "rides", label: "Rides" },
            { k: "saved", label: "Saved" },
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

        {tab === "posts" && (
          <div className="mt-5 grid grid-cols-3 gap-1.5">
            {MY_POSTS.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-white/5">
                <Image src={src} alt="" fill sizes="(max-width: 768px) 33vw, 200px" className="object-cover" />
              </div>
            ))}
          </div>
        )}

        {tab === "rides" && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="font-serif italic text-xl text-zinc-400">
              Your ride history will live here.
            </p>
          </div>
        )}

        {tab === "saved" && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="font-serif italic text-xl text-zinc-400">
              Posts you've saved appear here.
            </p>
          </div>
        )}
      </div>
    </main>
  </>
  );
}