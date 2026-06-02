"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  CompactProfileStats,
  type ProfileStatItem,
} from "@/components/profile/CompactProfileStats";

const BIO_PREVIEW_MAX = 88;

export type ProfileSocialLink = {
  label: string;
  href: string;
};

export type ProfileCardDetails = {
  quote?: string | null;
  bio?: string | null;
  socialLinks?: ProfileSocialLink[];
};

type CompactProfileCardProps = {
  displayName: string;
  handle: string;
  location: string;
  avatarUrl: string | null;
  blackcardMember: boolean;
  stats: ProfileStatItem[];
  actions: ReactNode;
  details?: ProfileCardDetails;
  notice?: ReactNode;
};

function BlackcardAccessCta({ locked = false }: { locked?: boolean }) {
  return (
    <Link
      href="/blackcard"
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] transition ${
        locked
          ? "border-[#b4141e]/25 bg-black/30 text-[#c9a0a4] hover:border-[#b4141e]/45"
          : "border-[#b4141e]/35 bg-white/[0.03] text-[#f1c3c7] hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10"
      }`}
    >
      Blackcard Access
      <span aria-hidden className="text-[#e87a82]">
        ›
      </span>
    </Link>
  );
}

export function CompactProfileCard({
  displayName,
  handle,
  location,
  avatarUrl,
  blackcardMember,
  stats,
  actions,
  details,
  notice,
}: CompactProfileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const quote = details?.quote?.trim() || "";
  const bio = details?.bio?.trim() || "";
  const socialLinks = details?.socialLinks || [];

  const { previewText, canExpand } = useMemo(() => {
    const primary = quote || bio;
    const hasBothTexts = Boolean(quote && bio);
    const hasSocial = socialLinks.length > 0;
    const primaryLong = primary.length > BIO_PREVIEW_MAX;

    const preview =
      primaryLong && !expanded
        ? `${primary.slice(0, BIO_PREVIEW_MAX).trim()}…`
        : primary;

    return {
      previewText: preview,
      canExpand: hasSocial || primaryLong || hasBothTexts,
    };
  }, [quote, bio, socialLinks.length, expanded]);

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

            {!expanded && previewText && (
              <p className="mt-2 text-sm leading-5 text-zinc-400">
                {previewText}
                {canExpand && (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="ml-1 text-[11px] uppercase tracking-[0.12em] text-[#d85f6c] hover:text-[#e87a82]"
                  >
                    more &gt;
                  </button>
                )}
              </p>
            )}

            {!expanded && !previewText && canExpand && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#d85f6c] hover:text-[#e87a82]"
              >
                more &gt;
              </button>
            )}

            {expanded && (
              <div className="mt-2 space-y-2 border-t border-white/5 pt-2">
                {quote && (
                  <p className="font-serif text-sm italic leading-6 text-zinc-300">“{quote}”</p>
                )}
                {bio && (
                  <p className="text-sm leading-5 text-zinc-400">{bio}</p>
                )}

                {socialLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-[11px] uppercase tracking-[0.12em] text-[#d85f6c] hover:text-[#e87a82]"
                >
                  less
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          {blackcardMember && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#b4141e]/45 bg-[#b4141e]/10 px-2.5 py-1 text-[8px] font-medium uppercase tracking-[0.16em] text-[#e87a82]">
              <span className="text-[10px] leading-none text-[#b4141e]">◆</span>
              Blackcard Member
            </span>
          )}
          <BlackcardAccessCta locked={!blackcardMember} />
        </div>

        {notice}

        <div className="relative mt-3">{actions}</div>

        <CompactProfileStats items={stats} />
      </div>
    </section>
  );
}

/** @deprecated Use ProfileCardDetails on CompactProfileCard instead */
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
