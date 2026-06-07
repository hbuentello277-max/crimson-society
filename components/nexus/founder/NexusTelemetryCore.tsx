"use client";

import type { PlatformRingStatus } from "@/lib/nexus/founder-derive";
import "./nexus-telemetry-core.css";

type TelemetryPalette = {
  label: string;
  primary: string;
  secondary: string;
  outer: string;
  glow: string;
  scan: string;
  node: string;
  segmentFill: string;
  scanDuration: string;
};

const PALETTES: Record<PlatformRingStatus, TelemetryPalette> = {
  operational: {
    label: "Operational",
    primary: "#ff1e2d",
    secondary: "#8b0e16",
    outer: "#ff1e2d",
    glow: "rgba(255,30,45,0.5)",
    scan: "rgba(255,30,45,0.28)",
    node: "rgba(255,56,71,0.85)",
    segmentFill: "rgba(255,255,255,0.88)",
    scanDuration: "5.5s",
  },
  warning: {
    label: "Needs Attention",
    primary: "#b4141e",
    secondary: "#6b0a10",
    outer: "#ffc107",
    glow: "rgba(255,193,7,0.42)",
    scan: "rgba(255,193,7,0.26)",
    node: "rgba(255,193,7,0.78)",
    segmentFill: "rgba(255,255,255,0.82)",
    scanDuration: "4.5s",
  },
  critical: {
    label: "Critical",
    primary: "#ff3847",
    secondary: "#9f111c",
    outer: "#ff3847",
    glow: "rgba(255,56,71,0.72)",
    scan: "rgba(255,56,71,0.4)",
    node: "rgba(255,80,90,1)",
    segmentFill: "rgba(255,255,255,0.92)",
    scanDuration: "2.8s",
  },
};

const TELEMETRY_NODES = [
  { angle: -90, delay: "0s" },
  { angle: -18, delay: "0.35s" },
  { angle: 54, delay: "0.7s" },
  { angle: 126, delay: "1.05s" },
  { angle: 198, delay: "1.4s" },
] as const;

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function segmentTransform(index: number, count: number) {
  return `rotate(${(360 / count) * index} 150 150)`;
}

export type NexusTelemetryCoreProps = {
  status: PlatformRingStatus;
  className?: string;
};

export function NexusTelemetryCore({ status, className = "" }: NexusTelemetryCoreProps) {
  const palette = PALETTES[status] ?? PALETTES.operational;
  const statusClass =
    status === "critical"
      ? "nexus-telemetry-core--critical"
      : status === "warning"
        ? "nexus-telemetry-core--warning"
        : "nexus-telemetry-core--operational";

  return (
    <div
      className={`nexus-telemetry-core relative mx-auto aspect-square w-full max-w-[min(76vw,15.5rem)] sm:max-w-[16.5rem] ${statusClass} ${className}`}
      style={
        {
          "--ntc-primary": palette.primary,
          "--ntc-secondary": palette.secondary,
          "--ntc-outer": palette.outer,
          "--ntc-glow": palette.glow,
          "--ntc-scan": palette.scan,
          "--ntc-node": palette.node,
          "--ntc-segment-fill": palette.segmentFill,
          "--ntc-scan-duration": palette.scanDuration,
        } as React.CSSProperties
      }
      role="img"
      aria-label={`Nexus Telemetry Core. Platform status: ${palette.label}.`}
    >
      <div
        aria-hidden
        className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,rgba(0,0,0,0.88)_48%,transparent_72%)]"
      />

      <svg
        className="relative z-[1] h-full w-full overflow-visible"
        viewBox="0 0 300 300"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="ntc-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="ntc-inner-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="45%" stopColor={palette.primary} stopOpacity="0.14" />
            <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ntc-scan-gradient" x1="150" y1="150" x2="254" y2="96">
            <stop offset="0%" stopColor={palette.primary} stopOpacity="0" />
            <stop offset="70%" stopColor={palette.scan} stopOpacity="0.35" />
            <stop offset="100%" stopColor={palette.primary} stopOpacity="0.72" />
          </linearGradient>
        </defs>

        {/* Outer thin orbit ring */}
        <circle
          cx="150"
          cy="150"
          r="132"
          stroke="var(--ntc-outer)"
          strokeOpacity="0.32"
          strokeWidth="1"
        />

        {/* Tick marks */}
        <g className="ntc-ticks">
          {Array.from({ length: 72 }).map((_, index) => (
            <line
              key={index}
              x1="150"
              y1="24"
              x2="150"
              y2={index % 6 === 0 ? "32" : "28"}
              transform={`rotate(${index * 5} 150 150)`}
              stroke="var(--ntc-primary)"
              strokeOpacity={index % 6 === 0 ? 0.65 : 0.28}
              strokeWidth={index % 6 === 0 ? 1.1 : 0.7}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Rotating segmented ring — clockwise */}
        <g className="ntc-spin-slow" filter="url(#ntc-glow)">
          {Array.from({ length: 16 }).map((_, index) => (
            <rect
              key={index}
              x="141"
              y="52"
              width="18"
              height="20"
              rx="2"
              transform={segmentTransform(index, 16)}
              fill="var(--ntc-segment-fill)"
              stroke="var(--ntc-primary)"
              strokeWidth="1.5"
              opacity="0.92"
            />
          ))}
        </g>

        {/* Inner glow ring — counter-clockwise */}
        <g className="ntc-spin-reverse-slow">
          <circle
            cx="150"
            cy="150"
            r="98"
            stroke="var(--ntc-secondary)"
            strokeOpacity="0.55"
            strokeWidth="1.25"
            strokeDasharray="10 14"
          />
          <circle
            cx="150"
            cy="150"
            r="88"
            stroke="var(--ntc-primary)"
            strokeOpacity="0.42"
            strokeWidth="2.5"
            strokeDasharray="36 18"
            strokeLinecap="round"
          />
        </g>

        {/* Radial scan line */}
        <g className="ntc-scan-line">
          <path d="M150 150 L248 94 A108 108 0 0 1 258 150 Z" fill="url(#ntc-scan-gradient)" />
          <line
            x1="150"
            y1="150"
            x2="256"
            y2="102"
            stroke="var(--ntc-primary)"
            strokeOpacity="0.55"
            strokeWidth="1"
          />
        </g>

        {/* Inner core glow */}
        <circle
          className="ntc-inner-glow-pulse"
          cx="150"
          cy="150"
          r="62"
          fill="url(#ntc-inner-glow)"
          stroke="var(--ntc-primary)"
          strokeOpacity="0.38"
          strokeWidth="1.25"
          filter="url(#ntc-glow)"
        />
        <circle
          cx="150"
          cy="150"
          r="50"
          fill="rgba(0,0,0,0.72)"
          stroke="var(--ntc-secondary)"
          strokeOpacity="0.65"
          strokeWidth="1"
        />

        {/* Telemetry nodes */}
        {TELEMETRY_NODES.map((node, index) => {
          const outer = polarToCartesian(150, 150, 118, node.angle);
          const inner = polarToCartesian(150, 150, 102, node.angle);
          return (
            <g
              key={index}
              className="ntc-pulse-soft"
              style={{ animationDelay: node.delay, transformOrigin: `${outer.x}px ${outer.y}px` }}
            >
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--ntc-primary)"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <circle
                cx={outer.x}
                cy={outer.y}
                r="7"
                fill="rgba(0,0,0,0.86)"
                stroke="var(--ntc-primary)"
                strokeWidth="1.75"
              />
              <circle cx={outer.x} cy={outer.y} r="3.25" fill="var(--ntc-node)" />
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
        <p className="select-none pl-[0.38em] font-sans text-[clamp(1.75rem,7.5vw,2.65rem)] font-semibold tracking-[0.38em] text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.35)]">
          NEXUS
        </p>
      </div>
    </div>
  );
}
