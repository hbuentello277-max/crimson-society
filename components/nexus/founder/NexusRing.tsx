"use client";

import { motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
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
  },
  warning: {
    label: "Needs Attention",
    accent: "#ffc107",
    accentSoft: "#9a6500",
    glow: "rgba(255,193,7,0.48)",
    scan: "rgba(255,193,7,0.32)",
    nodeGlow: "rgba(255,193,7,0.68)",
    segmentOpacity: 0.86,
  },
  critical: {
    label: "Critical",
    accent: "#ff3847",
    accentSoft: "#9f111c",
    glow: "rgba(255,56,71,0.68)",
    scan: "rgba(255,56,71,0.42)",
    nodeGlow: "rgba(255,56,71,0.9)",
    segmentOpacity: 1,
  },
};

const CX = 150;
const CY = 150;
const CORE_ORIGIN = "150px 150px";

export type NexusRingProps = {
  status: PlatformRingStatus;
  size?: number;
  className?: string;
};

function segmentTransform(index: number) {
  return `rotate(${index * 30} ${CX} ${CY})`;
}

function isAppleWebKit() {
  if (typeof navigator === "undefined") return false;
  return /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|CriOS|Chromium/i.test(navigator.userAgent);
}

function SmilRotate({ dur, reverse = false }: { dur: string; reverse?: boolean }) {
  return (
    <animateTransform
      attributeName="transform"
      attributeType="XML"
      type="rotate"
      from={reverse ? `360 ${CX} ${CY}` : `0 ${CX} ${CY}`}
      to={reverse ? `0 ${CX} ${CY}` : `360 ${CX} ${CY}`}
      dur={dur}
      repeatCount="indefinite"
    />
  );
}

function SmilOpacityPulse({
  dur,
  begin,
  values = "0.68;1;0.68",
}: {
  dur: string;
  begin?: string;
  values?: string;
}) {
  return (
    <animate
      attributeName="opacity"
      values={values}
      dur={dur}
      begin={begin}
      repeatCount="indefinite"
    />
  );
}

const SPIN_LINEAR = (duration: number, reverse = false) => ({
  animate: { rotate: reverse ? -360 : 360 },
  transition: { duration, repeat: Infinity, ease: "linear" as const },
});

const PULSE_OPACITY = (duration: number, delay = 0) => ({
  animate: { opacity: [0.68, 1, 0.68] },
  transition: { duration, repeat: Infinity, ease: "easeInOut" as const, delay },
});

export function NexusRing({ status, size = 260, className = "" }: NexusRingProps) {
  const uid = useId().replace(/:/g, "");
  const tone = STATUS_TONES[status] ?? STATUS_TONES.operational;
  const [useSmil, setUseSmil] = useState(false);

  useEffect(() => {
    setUseSmil(isAppleWebKit());
  }, []);

  const nodes = [
    { x: 150, y: 24, line: "M150 12v36", delay: 0, begin: "0s" },
    { x: 276, y: 150, line: "M252 150h36", delay: 0.45, begin: "0.45s" },
    { x: 150, y: 276, line: "M150 252v36", delay: 0.9, begin: "0.9s" },
    { x: 24, y: 150, line: "M12 150h36", delay: 1.35, begin: "1.35s" },
  ];

  const OuterOrbitWrapper = useSmil ? "g" : motion.g;
  const SegmentsWrapper = useSmil ? "g" : motion.g;
  const SegmentPulseWrapper = useSmil ? "g" : motion.g;
  const outerMotion = useSmil ? {} : { style: { transformOrigin: CORE_ORIGIN }, ...SPIN_LINEAR(18, true) };
  const segmentsMotion = useSmil ? {} : { style: { transformOrigin: CORE_ORIGIN }, ...SPIN_LINEAR(12) };
  const segmentPulseMotion = useSmil ? {} : PULSE_OPACITY(2.2);

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
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ opacity: [0.55, 1, 0.55], scale: [0.97, 1.03, 0.97] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.84)_42%,transparent_70%)",
        }}
      />

      <svg
        className="relative z-[1] h-full w-full"
        viewBox="0 0 300 300"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={`nexus-core-glow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`nexus-inner-glow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.09" />
            <stop offset="48%" stopColor={tone.accent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={tone.accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r="126"
          stroke="var(--core-accent)"
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />

        <OuterOrbitWrapper
          className="nexus-core__outer-orbit"
          filter={`url(#nexus-core-glow-${uid})`}
          {...outerMotion}
        >
          {useSmil ? <SmilRotate dur="18s" reverse /> : null}
          <circle
            cx={CX}
            cy={CY}
            r="116"
            stroke="var(--core-accent)"
            strokeOpacity="0.58"
            strokeWidth="5"
            strokeDasharray="58 22"
            strokeLinecap="round"
            fill="none"
          />
        </OuterOrbitWrapper>

        <g className="nexus-core__ticks">
          {Array.from({ length: 96 }).map((_, index) => (
            <line
              key={index}
              x1={CX}
              y1="30"
              x2={CX}
              y2={index % 6 === 0 ? "38" : "35"}
              transform={`rotate(${index * 3.75} ${CX} ${CY})`}
              stroke="var(--core-accent)"
              strokeOpacity={index % 6 === 0 ? 0.72 : 0.34}
              strokeWidth={index % 6 === 0 ? 1.2 : 0.75}
              strokeLinecap="round"
            />
          ))}
        </g>

        <SegmentsWrapper
          className="nexus-core__segments"
          filter={`url(#nexus-core-glow-${uid})`}
          {...segmentsMotion}
        >
          {useSmil ? <SmilRotate dur="12s" /> : null}
          <SegmentPulseWrapper {...segmentPulseMotion}>
            {useSmil ? <SmilOpacityPulse dur="2.2s" /> : null}
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
          </SegmentPulseWrapper>
        </SegmentsWrapper>

        {useSmil ? (
          <circle
            className="nexus-core__inner-glow"
            cx={CX}
            cy={CY}
            r="70"
            fill={`url(#nexus-inner-glow-${uid})`}
            stroke="var(--core-accent)"
            strokeOpacity="0.34"
            strokeWidth="1.25"
            style={{ filter: "drop-shadow(0 0 16px var(--core-glow))" }}
          >
            <SmilOpacityPulse dur="3.2s" values="0.62;1;0.62" />
          </circle>
        ) : (
          <motion.circle
            className="nexus-core__inner-glow"
            cx={CX}
            cy={CY}
            r="70"
            fill={`url(#nexus-inner-glow-${uid})`}
            stroke="var(--core-accent)"
            strokeOpacity="0.34"
            strokeWidth="1.25"
            style={{ transformOrigin: CORE_ORIGIN, filter: "drop-shadow(0 0 16px var(--core-glow))" }}
            {...PULSE_OPACITY(3.2)}
          />
        )}

        <circle
          cx={CX}
          cy={CY}
          r="58"
          fill="rgba(0,0,0,0.72)"
          stroke="var(--core-accent-soft)"
          strokeOpacity="0.58"
          strokeWidth="1"
        />

        {nodes.map((node) =>
          useSmil ? (
            <g
              key={`${node.x}-${node.y}`}
              className="nexus-core__node"
              style={{ filter: "drop-shadow(0 0 8px var(--core-node-glow))" }}
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
              <SmilOpacityPulse dur="2.2s" begin={node.begin} values="0.62;1;0.62" />
            </g>
          ) : (
            <motion.g
              key={`${node.x}-${node.y}`}
              className="nexus-core__node"
              style={{
                transformOrigin: `${node.x}px ${node.y}px`,
                filter: "drop-shadow(0 0 8px var(--core-node-glow))",
              }}
              animate={{ opacity: [0.62, 1, 0.62] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: node.delay,
              }}
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
          ),
        )}
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
