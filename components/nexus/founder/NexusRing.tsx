"use client";

import { motion } from "framer-motion";
import type { PlatformRingStatus } from "@/lib/nexus/founder-derive";

/** Operational baseline — crimson palette (approved default). */
const STATUS_STYLES: Record<
  PlatformRingStatus,
  { glow: string; ring: string; pulse: string; bloom: string }
> = {
  operational: {
    ring: "#b4141e",
    glow: "rgba(180,20,30,0.55)",
    pulse: "rgba(180,20,30,0.35)",
    bloom: "none",
  },
  warning: {
    ring: "#ffc107",
    glow: "rgba(255,193,7,0.62)",
    pulse: "rgba(255,193,7,0.34)",
    bloom: "drop-shadow(0 0 20px rgba(255,193,7,0.28))",
  },
  critical: {
    ring: "#ff3847",
    glow: "rgba(255,56,71,0.78)",
    pulse: "rgba(255,56,71,0.48)",
    bloom: "drop-shadow(0 0 32px rgba(255,56,71,0.5))",
  },
};

/** Animation baselines at operational; warning +20% speed, critical +45% speed. */
const BASE_DURATIONS = {
  ambientPulse: 4,
  outerRings: [28, 36, 44] as const,
  tickBurst: 18,
  midRing: 22,
  nexusText: 3.5,
};

const SPEED_MULTIPLIER: Record<PlatformRingStatus, number> = {
  operational: 1,
  warning: 1.2,
  critical: 1.45,
};

const AMBIENT_OPACITY: Record<PlatformRingStatus, [number, number, number]> = {
  operational: [0.35, 0.7, 0.35],
  warning: [0.38, 0.78, 0.38],
  critical: [0.42, 0.88, 0.42],
};

const AMBIENT_SCALE: Record<PlatformRingStatus, [number, number, number]> = {
  operational: [0.96, 1.04, 0.96],
  warning: [0.95, 1.05, 0.95],
  critical: [0.94, 1.07, 0.94],
};

function scaledDuration(base: number, status: PlatformRingStatus) {
  return base / SPEED_MULTIPLIER[status];
}

export type NexusRingProps = {
  status: PlatformRingStatus;
  size?: number;
  className?: string;
};

export function NexusRing({ status, size = 280, className = "" }: NexusRingProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.operational;
  const center = size / 2;
  const outerRadius = size * 0.42;
  const midRadius = size * 0.34;
  const innerRadius = size * 0.26;

  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{ width: size, height: size, filter: styles.bloom }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          opacity: AMBIENT_OPACITY[status],
          scale: AMBIENT_SCALE[status],
        }}
        transition={{
          duration: scaledDuration(BASE_DURATIONS.ambientPulse, status),
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: `radial-gradient(circle, ${styles.pulse} 0%, transparent 68%)`,
          filter: "blur(8px)",
        }}
      />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-[1]">
        {BASE_DURATIONS.outerRings.map((baseDuration, index) => {
          const scale = [1, 0.72, 0.48][index];
          return (
            <motion.circle
              key={scale}
              cx={center}
              cy={center}
              r={outerRadius * scale}
              fill="none"
              stroke={styles.ring}
              strokeOpacity={0.12 + index * 0.06}
              strokeWidth={index === 0 ? 1.5 : 0.75}
              animate={{ rotate: index % 2 === 0 ? 360 : -360 }}
              transition={{
                duration: scaledDuration(baseDuration, status),
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ transformOrigin: `${center}px ${center}px` }}
            />
          );
        })}

        <motion.g
          animate={{ rotate: 360 }}
          transition={{
            duration: scaledDuration(BASE_DURATIONS.tickBurst, status),
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {Array.from({ length: 24 }).map((_, index) => {
            const angle = (index / 24) * Math.PI * 2;
            const x1 = center + Math.cos(angle) * (midRadius - 6);
            const y1 = center + Math.sin(angle) * (midRadius - 6);
            const x2 = center + Math.cos(angle) * (midRadius + (index % 3 === 0 ? 10 : 4));
            const y2 = center + Math.sin(angle) * (midRadius + (index % 3 === 0 ? 10 : 4));
            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={styles.ring}
                strokeOpacity={index % 3 === 0 ? 0.9 : 0.35}
                strokeWidth={index % 3 === 0 ? 2 : 1}
              />
            );
          })}
        </motion.g>

        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="rgba(0,0,0,0.55)"
          stroke={styles.ring}
          strokeOpacity={0.35}
          strokeWidth={1}
        />

        <motion.circle
          cx={center}
          cy={center}
          r={midRadius}
          fill="none"
          stroke={styles.ring}
          strokeWidth={3}
          strokeOpacity={0.85}
          strokeDasharray="12 8 4 8"
          animate={{ rotate: -360 }}
          transition={{
            duration: scaledDuration(BASE_DURATIONS.midRing, status),
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
      </svg>

      <div className="absolute inset-0 z-[2] flex items-center justify-center">
        <motion.p
          className="pl-[0.35em] font-sans text-4xl font-semibold tracking-[0.35em] text-white sm:text-5xl"
          style={{
            textShadow: "0 0 24px rgba(255,255,255,0.4), 0 0 48px rgba(255,255,255,0.22)",
          }}
          animate={{ opacity: [0.88, 1, 0.88] }}
          transition={{
            duration: scaledDuration(BASE_DURATIONS.nexusText, status),
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          NEXUS
        </motion.p>
      </div>
    </div>
  );
}

export const NEXUS_TELEMETRY_STATUS_CONFIG = {
  colors: STATUS_STYLES,
  baseDurations: BASE_DURATIONS,
  speedMultiplier: SPEED_MULTIPLIER,
} as const;
