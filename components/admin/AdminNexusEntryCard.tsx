"use client";

import Link from "next/link";

export function AdminNexusEntryCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#b4141e]/50 bg-gradient-to-b from-[#1a080b]/90 to-black/90 p-8 shadow-[0_0_40px_rgba(180,20,30,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] md:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,20,30,0.14),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b4141e]/70 to-transparent"
      />

      <div className="relative flex flex-col items-center text-center">
        <h2 className="font-serif text-3xl text-white md:text-4xl">Project Nexus</h2>
        <Link
          href="/admin/nexus"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[#b4141e]/60 bg-[#b4141e]/25 px-8 py-2.5 text-xs uppercase tracking-[0.24em] text-[#f1c3c7] shadow-[0_0_20px_rgba(180,20,30,0.25)] transition hover:border-[#b4141e]/90 hover:bg-[#b4141e]/35"
        >
          OPEN NEXUS
        </Link>
      </div>
    </section>
  );
}
