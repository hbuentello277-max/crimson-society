"use client";

import Link from "next/link";
import { membershipTierLabel, type CrimsonMembershipTier } from "@/lib/membership";

type Props = {
  tier: CrimsonMembershipTier;
  showAccessCta?: boolean;
};

const BADGE_BASE =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[8px] font-medium uppercase tracking-[0.16em]";

function MembershipBadgePill({ tier }: { tier: Exclude<CrimsonMembershipTier, "free"> }) {
  if (tier === "founder") {
    return (
      <span
        className={`${BADGE_BASE} border border-[#f5d0a0]/55 bg-gradient-to-r from-[#f5d0a0]/20 to-[#b4141e]/20 text-[#fff1d6] shadow-[0_0_20px_-8px_rgba(245,208,160,0.45)]`}
      >
        <span className="text-[11px] leading-none" aria-hidden>
          🏆
        </span>
        {membershipTierLabel("founder")}
      </span>
    );
  }

  if (tier === "founding") {
    return (
      <span
        className={`${BADGE_BASE} border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-[#b4141e]/15 text-amber-100 shadow-[0_0_20px_-8px_rgba(251,191,36,0.45)]`}
      >
        <span className="text-[11px] leading-none" aria-hidden>
          🏆
        </span>
        {membershipTierLabel("founding")}
      </span>
    );
  }

  return (
    <span
      className={`${BADGE_BASE} border border-[#b4141e]/45 bg-[#b4141e]/10 text-[#e87a82]`}
    >
      <span className="text-[11px] leading-none" aria-hidden>
        🏆
      </span>
      {membershipTierLabel("blackcard")}
    </span>
  );
}

export function MembershipTierBadge({ tier, showAccessCta = true }: Props) {
  const hasBlackcardAccess = tier !== "free";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tier !== "free" ? <MembershipBadgePill tier={tier} /> : null}

      {showAccessCta ? (
        <Link
          href="/blackcard"
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] transition ${
            hasBlackcardAccess
              ? "border-[#b4141e]/35 bg-white/[0.03] text-[#f1c3c7] hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10"
              : "border-[#b4141e]/25 bg-black/30 text-[#c9a0a4] hover:border-[#b4141e]/45"
          }`}
        >
          {hasBlackcardAccess ? "Blackcard Access" : "Unlock Blackcard"}
          <span aria-hidden className="text-[#e87a82]">
            ›
          </span>
        </Link>
      ) : null}
    </div>
  );
}
