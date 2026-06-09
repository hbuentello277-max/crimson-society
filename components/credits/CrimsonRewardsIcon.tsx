"use client";

import type { HTMLAttributes } from "react";

export const CRIMSON_REWARDS_SIZES = [20, 24, 32, 48] as const;

export type CrimsonRewardsSize = (typeof CRIMSON_REWARDS_SIZES)[number];

type CrimsonRewardsIconProps = {
  size?: CrimsonRewardsSize | number;
  className?: string;
  title?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

/** Shared crimson crown — same 👑 glyph as Blackcard badge and Rewards button. */
export function CrimsonRewardsIcon({
  size = 24,
  className = "",
  title = "Crimson Rewards",
  style,
  ...props
}: CrimsonRewardsIconProps) {
  return (
    <span
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.92), ...style }}
      {...props}
    >
      👑
    </span>
  );
}
