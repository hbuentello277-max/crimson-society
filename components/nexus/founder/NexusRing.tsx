"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PlatformRingStatus } from "@/lib/nexus/founder-derive";
import "./nexus-ring.css";

type CoreTone = {
  label: string;
  accent: string;
  accentSoft: string;
  glow: string;
  scan: string;
  nodeGlow: string;
  segmentOpacity: number;
  scanDuration: number;
};

const STATUS_TONES: Record<PlatformRingStatus, CoreTone> = {
  operational: {
    label: "Operational",
    accent: "#ff1e2d",
    accentSoft: "#8b0e16",
    glow: "rgba(255,30,45,0.54)",
    scan: "rgba(255,30,45,0.32)",
    nodeGlow: "rgba(255,56,71,0.74)",
    segmentOpacity: 0.9,
    scanDuration: 4.5,
  },
  warning: {
    label: "Needs Attention",
    accent: "#ffc107",
    accentSoft: "#9a6500",
    glow: "rgba(255,193,7,0.48)",
    scan: "rgba(255,193,7,0.32)",
    nodeGlow: "rgba(255,193,7,0.68)",
    segmentOpacity: 0.86,
    scanDuration: 3.8,
  },
  critical: {
    label: "Critical",
    accent: "#ff3847",
    accentSoft: "#9f111c",
    glow: "rgba(255,56,71,0.68)",
    scan: "rgba(255,56,71,0.42)",
    nodeGlow: "rgba(255,56,71,0.9)",
    segmentOpacity: 1,
    scanDuration: 2.4,
  },
};

const CORE_ORIGIN = "150px 150px";

export type NexusRingProps = {
  status: PlatformRingStatus;
  size?: number;
  className?: string;
};

function segmentTransform(index: number) {
  return `rotate(${index * 30} 150 150)`;
}

export function NexusRing({ status, size = 260, className = "" }: NexusRingProps) {
  const tone = STATUS_TONES[status] ?? STATUS_TONES.operational;
  const reduceMotion = useReducedMotion();
  const nodes = [
    { x: 150, y: 24, line: "M150 12v36", delay: 0 },
    { x: 276, y: 150, line: "M252 150h36", delay: 0.45 },
    { x: 150, y: 276, line: "M150 252v36", delay: 0.9 },
    { x: 24, y: 150, line: "M12 150h36", delay: 1.35 },
  ];

  const spin = (duration: number, reverse = false) =>
    reduceMotion
      ? {}
      : {
          animate: { rotate: reverse ? -360 : 360 },
          transition: { duration, repeat: Infinity, ease: "linear" as const },
        };

  const pulse = (duration: number, delay = 0) =>
    reduceMotion
      ? {}
      : {
          animate: { opacity: [0.68, 1, 0.68] },
          transition: { duration, repeat: Infinity, ease: "easeInOut" as const, delay },
        };

  const nodePulse = (delay: number) =>
    reduceMotion
      ? {}
      : {
          animate: { opacity: [0.62, 1, 0.62], scale: [0.9, 1.14, 0.9] },
          transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const, delay },
        };

  return (
    <div
      className={`nexus-core relative mx-auto aspect-square w-full max-w-[min(72vw,17rem)] overflow-hidden sm:max-w-[17.5rem] ${className}`}
      style={
        {
          "--core-accent": tone.accent,
          "--core-accent-soft": tone.accentSoft,
          "--core-glow": tone.glow,
          "--core-scan": tone.scan,
          "--core-node-glow": tone.nodeGlow,
          "--core-segment-opacity": tone.segmentOpacity,
          maxWidth: `min(72vw, ${size}px)`,
        } as React.CSSProperties
      }
      role="img"
      aria-label={`Nexus telemetry core. Platform status: ${tone.label}.`}
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.84)_42%,transparent_70%)]" />
      <svg
        className="relative z-[1] h-full w-full"
        viewBox="0 0 300 300"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="nexus-core-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="nexus-inner-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.09" />
            <stop offset="48%" stopColor={tone.accent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={tone.accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="nexus-scan-gradient" x1="150" y1="150" x2="256" y2="98">
            <stop offset="0%" stopColor={tone.accent} stopOpacity="0" />
            <stop offset="55%" stopColor={tone.accent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={tone.accent} stopOpacity="0.82" />
          </linearGradient>
        </defs>

        <motion.g
          className="nexus-core__outer-orbit"
          style={{ transformOrigin: CORE_ORIGIN }}
          {...spin(14)}
        >
          <circle
            cx="150"
            cy="150"
            r="126"
            stroke="var(--core-accent)"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          <circle
            cx="150"
            cy="150"
            r="116"
            stroke="var(--core-accent)"
            strokeOpacity="0.58"
            strokeWidth="5"
            strokeDasharray="58 22"
            strokeLinecap="round"
            filter="url(#nexus-core-glow)"
          />
        </motion.g>

        <g className="nexus-core__ticks">
          {Array.from({ length: 96 }).map((_, index) => (
            <line
              key={index}
              x1="150"
              y1="30"
              x2="150"
              y2={index % 6 === 0 ? "38" : "35"}
              transform={`rotate(${index * 3.75} 150 150)`}
              stroke="var(--core-accent)"
              strokeOpacity={index % 6 === 0 ? 0.72 : 0.34}
              strokeWidth={index % 6 === 0 ? 1.2 : 0.75}
              strokeLinecap="round"
            />
          ))}
        </g>

        <motion.g
          className="nexus-core__segments"
          style={{ transformOrigin: CORE_ORIGIN }}
          filter="url(#nexus-core-glow)"
          {...spin(12)}
        >
          <motion.g {...pulse(2.2)}>
            {Array.from({ length: 12 }).map((_, index) => (
              <rect
                key={index}
                x="137"
                y="58"
                width="26"
                height="24"
                rx="3"
                transform={segmentTransform(index)}
                fill="rgba(255,255,255,0.84)"
                stroke="var(--core-accent)"
                strokeWidth="2"
                opacity="var(--core-segment-opacity)"
              />
            ))}
          </motion.g>
        </motion.g>

        <motion.g
          className="nexus-core__scan"
          style={{ transformOrigin: CORE_ORIGIN, mixBlendMode: "screen" }}
          {...spin(tone.scanDuration)}
        >
          <path d="M150 150 L247 96 A112 112 0 0 1 260 150 Z" fill="url(#nexus-scan-gradient)" />
          <line
            x1="150"
            y1="150"
            x2="258"
            y2="104"
            stroke="var(--core-accent)"
            strokeOpacity="0.8"
            strokeWidth="1.25"
          />
        </motion.g>

        <motion.circle
          className="nexus-core__inner-glow"
          cx="150"
          cy="150"
          r="70"
          fill="url(#nexus-inner-glow)"
          stroke="var(--core-accent)"
          strokeOpacity="0.34"
          strokeWidth="1.25"
          style={{ transformOrigin: CORE_ORIGIN, filter: "drop-shadow(0 0 16px var(--core-glow))" }}
          {...pulse(3.2)}
        />
        <circle
          cx="150"
          cy="150"
          r="58"
          fill="rgba(0,0,0,0.72)"
          stroke="var(--core-accent-soft)"
          strokeOpacity="0.58"
          strokeWidth="1"
        />

        {nodes.map((node) => (
          <motion.g
            key={`${node.x}-${node.y}`}
            className="nexus-core__node"
            style={{
              transformOrigin: `${node.x}px ${node.y}px`,
              filter: "drop-shadow(0 0 8px var(--core-node-glow))",
            }}
            {...nodePulse(node.delay)}
          >
            <path d={node.line} stroke="var(--core-accent)" strokeWidth="1.5" strokeLinecap="round" />
            <circle
              cx={node.x}
              cy={node.y}
              r="9"
              fill="rgba(0,0,0,0.84)"
              stroke="var(--core-accent)"
              strokeWidth="2"
            />
            <circle cx={node.x} cy={node.y} r="4.5" fill="var(--core-accent)" />
          </motion.g>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
        <div className="flex h-[38%] w-[38%] items-center justify-center">
          <p className="select-none text-center font-sans text-[clamp(0.95rem,5vw,1.72rem)] font-semibold leading-none tracking-[0.1em] text-white sm:text-[clamp(1.35rem,5.2vw,2.35rem)] sm:tracking-[0.15em]">
            NEXUS
          </p>
        </div>
      </div>
    </div>
  );
}
