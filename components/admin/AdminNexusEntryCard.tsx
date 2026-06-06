"use client";

import Link from "next/link";

export function AdminNexusEntryCard() {
  return (
    <div className="rounded-2xl border border-[#b4141e]/45 bg-black/35 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <h2 className="font-serif text-2xl text-white md:text-3xl">Project Nexus</h2>
      <Link
        href="/admin/nexus"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-5 py-2 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:border-[#b4141e]/80 hover:bg-[#b4141e]/30"
      >
        OPEN NEXUS
      </Link>
    </div>
  );
}
