"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CompactProfileStats,
  type ProfileStatItem,
} from "@/components/profile/CompactProfileStats";

const BIO_PREVIEW_MAX = 88;

type CompactProfileCardProps = {
  displayName: string;
  handle: string;
  location: string;
  bioPreview: string;
  bioHasMore: boolean;
  avatarUrl: string | null;
  blackcardMember: boolean;
  showBlackcardAccessCta?: boolean;
  stats: ProfileStatItem[];
  actions: ReactNode;
  blackcardRow?: ReactNode;
  notice?: ReactNode;
};

export function CompactProfileCard({
  displayName,
  handle,
  location,
  bioPreview,
  bioHasMore,
  avatarUrl,
  blackcardMember,
  showBlackcardAccessCta = false,
  stats,
  actions,
  blackcardRow,
  notice,
}: CompactProfileCardProps) {
  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707] shadow-[0_20px_50px_-40px_rgba(0,0,0,0.95)]">
      <div className="relative p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,20,30,0.1),transparent_40%)]" />

        <div className="relative flex gap-3">
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border border-[#b4141e]/50 bg-black shadow-[0_0_24px_-8px_rgba(180,20,30,0.75)]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${displayName} profile picture`}
                fill
                sizes="72px"
                priority
                className="object-cover"
                unoptimized={avatarUrl.includes("supabase")}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.24),transparent_58%)] font-serif text-2xl text-[#f0c8cb]">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="truncate font-serif text-xl leading-tight text-white">{displayName}</h2>
            <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.14em] text-zinc-500">
              {handle}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-400">{location}</p>

            {bioPreview && (
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-400">
                {bioPreview}
                {bioHasMore && (
                  <span className="ml-1 text-[11px] uppercase tracking-[0.12em] text-[#d85f6c]">
                    more &gt;
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {(blackcardMember || showBlackcardAccessCta || blackcardRow) && (
          <div className="relative mt-3 flex flex-wrap items-center gap-2">
            {blackcardMember && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#b4141e]/45 bg-[#b4141e]/10 px-2.5 py-1 text-[8px] font-medium uppercase tracking-[0.16em] text-[#e87a82]">
                <span className="text-[10px] leading-none text-[#b4141e]">◆</span>
                Blackcard Member
              </span>
            )}

            {showBlackcardAccessCta && (
              <Link
                href="/blackcard"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#b4141e]/35 bg-white/[0.03] px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10"
              >
                Blackcard Access
                <span aria-hidden className="text-[#e87a82]">
                  ›
                </span>
              </Link>
            )}

            {blackcardRow}
          </div>
        )}

        {notice}

        <div className="relative mt-3">{actions}</div>

        <CompactProfileStats items={stats} />
      </div>
    </section>
  );
}

export function buildBioPreview(quote?: string | null, bio?: string | null) {
  const combined = quote?.trim() || bio?.trim() || "";
  if (!combined) {
    return { bioPreview: "", bioHasMore: false };
  }

  if (combined.length <= BIO_PREVIEW_MAX) {
    return { bioPreview: combined, bioHasMore: false };
  }

  return {
    bioPreview: `${combined.slice(0, BIO_PREVIEW_MAX).trim()}…`,
    bioHasMore: true,
  };
}
