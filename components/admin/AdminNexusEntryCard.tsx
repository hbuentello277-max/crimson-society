"use client";

import Link from "next/link";

export function AdminNexusEntryCard() {
  return (
    <section className="mt-8 rounded-2xl border border-[#b4141e]/25 bg-[#b4141e]/10 p-6">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">Project Nexus</p>
        <h2 className="mt-2 font-serif text-2xl text-white md:text-3xl">
          System Intelligence &amp; Operations
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
          Monitor platform health, mission status, alerts, incidents, observations, and business
          intelligence.
        </p>
        <Link
          href="/admin/nexus"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:border-[#b4141e]/80 hover:bg-[#b4141e]/30"
        >
          Open Nexus
        </Link>
      </div>
    </section>
  );
}
