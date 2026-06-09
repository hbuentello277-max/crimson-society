"use client";

import { useId, type SVGProps } from "react";

export const CRIMSON_COIN_SIZES = [20, 24, 32, 48] as const;

export type CrimsonCoinSize = (typeof CRIMSON_COIN_SIZES)[number];

type CrimsonCoinIconProps = {
  size?: CrimsonCoinSize | number;
  className?: string;
  title?: string;
} & Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox">;

export function CrimsonCoinIcon({
  size = 24,
  className = "",
  title = "Crimson Credits",
  ...props
}: CrimsonCoinIconProps) {
  const uid = useId().replace(/:/g, "");
  const ringGradientId = `crimson-coin-ring-${uid}`;
  const shineGradientId = `crimson-coin-shine-${uid}`;
  const faceGradientId = `crimson-coin-face-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={`shrink-0 ${className}`}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={ringGradientId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f1c3c7" />
          <stop offset="22%" stopColor="#e87a82" />
          <stop offset="50%" stopColor="#b4141e" />
          <stop offset="78%" stopColor="#7a1018" />
          <stop offset="100%" stopColor="#b4141e" />
        </linearGradient>
        <radialGradient id={faceGradientId} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#161012" />
          <stop offset="55%" stopColor="#0b0809" />
          <stop offset="100%" stopColor="#050405" />
        </radialGradient>
        <linearGradient id={shineGradientId} x1="12" y1="10" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="22.5" fill={`url(#${ringGradientId})`} />
      <circle cx="24" cy="24" r="18.25" fill={`url(#${faceGradientId})`} />
      <circle cx="24" cy="24" r="18.25" fill="none" stroke="#b4141e" strokeOpacity="0.28" strokeWidth="0.75" />
      <ellipse cx="18.5" cy="16.5" rx="9" ry="5.5" fill={`url(#${shineGradientId})`} transform="rotate(-28 18.5 16.5)" />

      <path
        d="M30.2 17.4c-4.9 0-8.7 3.1-8.7 7.1s3.8 7.1 8.7 7.1c1.7 0 3.1-.45 4.1-1.2"
        fill="none"
        stroke="#f1c3c7"
        strokeWidth="2.35"
        strokeLinecap="round"
      />
      <path
        d="M20.2 20.1c1.5-1.1 3.4-1.7 5.4-1.5 2.2.2 3.9 1.3 4.8 2.9.8 1.4.5 3.1-.8 4.2-1.8 1.5-4.3 2-6.6 1.4"
        fill="none"
        stroke="#e87a82"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
