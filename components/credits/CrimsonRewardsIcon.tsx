"use client";

import type { SVGProps } from "react";

export const CRIMSON_REWARDS_SIZES = [20, 24, 32, 48] as const;

export type CrimsonRewardsSize = (typeof CRIMSON_REWARDS_SIZES)[number];

type CrimsonRewardsIconProps = {
  size?: CrimsonRewardsSize | number;
  className?: string;
  title?: string;
} & Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox">;

/** Simple crimson crown — shared rewards branding across Profile and Shop. */
export function CrimsonRewardsIcon({
  size = 24,
  className = "",
  title = "Crimson Rewards",
  ...props
}: CrimsonRewardsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={`shrink-0 ${className}`}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="#e87a82"
        d="M4 17h16l-1.6-8.2-3.4 3.6-3-5.4-3 5.4-3.4-3.6L4 17z"
      />
      <path fill="#b4141e" d="M3 17.5h18v2.5H3z" />
      <circle cx="7" cy="10.2" r="0.9" fill="#f1c3c7" />
      <circle cx="12" cy="7.8" r="0.9" fill="#f1c3c7" />
      <circle cx="17" cy="10.2" r="0.9" fill="#f1c3c7" />
    </svg>
  );
}
