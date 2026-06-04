import type { CrimsonMembershipTier } from "@/lib/membership";

type Props = {
  tier: CrimsonMembershipTier;
  className?: string;
};

/**
 * Display-only membership badge for admin member lists.
 * Does not grant access — use server membership resolution for authorization.
 */
export function AdminMembershipBadge({ tier, className = "" }: Props) {
  if (tier === "founding") {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-amber-500/45 bg-gradient-to-r from-amber-500/20 to-amber-600/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100 ${className}`}
      >
        Founding
      </span>
    );
  }

  if (tier === "blackcard") {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-[#b4141e]/55 bg-gradient-to-r from-[#b4141e]/25 to-[#7a1018]/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f5c8cc] shadow-[0_0_20px_-8px_rgba(180,20,30,0.65)] ${className}`}
      >
        Blackcard
      </span>
    );
  }

  return null;
}
