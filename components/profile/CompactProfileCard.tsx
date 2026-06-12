"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  CompactProfileStats,
  type ProfileStatItem,
} from "@/components/profile/CompactProfileStats";
import { MembershipTierBadge } from "@/components/profile/MembershipTierBadge";
import { CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";
import type { CrimsonMembershipTier } from "@/lib/membership";

const BIO_PREVIEW_MAX = 88;

const HEADER_SOCIAL_ORDER = ["Instagram", "TikTok", "YouTube"] as const;

function HeaderSocialIcon({ label }: { label: (typeof HEADER_SOCIAL_ORDER)[number] }) {
  if (label === "Instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3 w-3 shrink-0" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.25" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (label === "TikTok") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden>
        <path d="M16.5 5.2c.9 1.1 2.1 1.8 3.5 1.9V11c-1.3 0-2.5-.4-3.5-1.1v5.4c0 2.7-2.2 4.9-4.9 4.9S6.7 17.9 6.7 15.2s2.2-4.9 4.9-4.9c.3 0 .6 0 .9.1v2.6a2.3 2.3 0 0 0-.9-.2c-1.3 0-2.3 1-2.3 2.3s1 2.3 2.3 2.3 2.3-1 2.3-2.3V5.2h2.6z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden>
      <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2H15v11.4a3.2 3.2 0 1 1-3.2-3.2c.3 0 .6 0 .9.1v-2.4a5.6 5.6 0 1 0 5.6 5.6V9.4c1.3.8 2.8 1.2 4.3 1.1V8c-1 0-1.9-.3-2.7-.8z" />
    </svg>
  );
}

function HeaderSocialLink({
  label,
  href,
}: {
  label: (typeof HEADER_SOCIAL_ORDER)[number];
  href?: string;
}) {
  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-[7.5rem] shrink-0 items-center justify-end gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-zinc-500 transition hover:border-[#b4141e]/40 hover:text-[#e87a82] sm:max-w-none"
    >
      <HeaderSocialIcon label={label} />
      <span className="truncate">{label}</span>
    </a>
  );
}

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
  membershipTier?: CrimsonMembershipTier;
  stats: ProfileStatItem[];
  actions: ReactNode;
  details?: ProfileCardDetails;
  notice?: ReactNode;
};

export function CompactProfileCard({
  displayName,
  handle,
  location,
  avatarUrl,
  membershipTier = "free",
  stats,
  actions,
  details,
  notice,
}: CompactProfileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const quote = details?.quote?.trim() || "";
  const bio = details?.bio?.trim() || "";
  const socialLinks = details?.socialLinks || [];

  const headerSocialByLabel = useMemo(() => {
    const links = new Map(socialLinks.map((link) => [link.label, link.href]));
    return HEADER_SOCIAL_ORDER.map((label) => ({
      label,
      href: links.get(label),
    }));
  }, [socialLinks]);

  const expandedSocialLinks = useMemo(
    () => socialLinks.filter((link) => link.label === "Website"),
    [socialLinks],
  );

  const { previewText, canExpand } = useMemo(() => {
    const primary = quote || bio;
    const hasBothTexts = Boolean(quote && bio);
    const hasExpandedSocial = expandedSocialLinks.length > 0;
    const primaryLong = primary.length > BIO_PREVIEW_MAX;

    const preview =
      primaryLong && !expanded
        ? `${primary.slice(0, BIO_PREVIEW_MAX).trim()}…`
        : primary;

    return {
      previewText: preview,
      canExpand: hasExpandedSocial || primaryLong || hasBothTexts,
    };
  }, [quote, bio, expandedSocialLinks.length, expanded]);

  return (
    <section className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707] shadow-[0_20px_50px_-40px_rgba(0,0,0,0.95)]">
      <div className="relative p-3">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,20,30,0.1),transparent_40%)]" />

        <div className="relative flex gap-3">
          <div className={`relative h-[72px] w-[72px] shrink-0 ${CS_AVATAR_RING}`}>
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
              <div className={`${CS_AVATAR_FALLBACK} text-2xl`}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5">
              <h2 className="truncate font-serif text-xl leading-tight text-white">{displayName}</h2>
              <HeaderSocialLink label="Instagram" href={headerSocialByLabel[0]?.href} />

              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                {handle}
              </p>
              <HeaderSocialLink label="TikTok" href={headerSocialByLabel[1]?.href} />

              <p className="truncate text-xs text-zinc-400">{location}</p>
              <HeaderSocialLink label="YouTube" href={headerSocialByLabel[2]?.href} />
            </div>

            {!expanded && previewText && (
              <p className="mt-1.5 text-sm leading-5 text-zinc-400">
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

                {expandedSocialLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {expandedSocialLinks.map((link) => (
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

        <div className="relative mt-2">
          <MembershipTierBadge tier={membershipTier} />
        </div>

        {notice}

        <CompactProfileStats items={stats} />

        <div className="relative mt-2">{actions}</div>
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
