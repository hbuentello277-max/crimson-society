"use client";

import { motion } from "framer-motion";
import type { PlatformRingStatus } from "@/lib/nexus/founder-derive";

const STATUS_STYLES: Record<
  PlatformRingStatus,
  { glow: string; ring: string; pulse: string; accent: string }
> = {
  operational: {
    glow: "rgba(180,20,30,0.55)",
    ring: "#b4141e",
    pulse: "rgba(180,20,30,0.35)",
    accent: "#e87a82",
  },
  warning: {
    glow: "rgba(245,158,11,0.45)",
    ring: "#f59e0b",
    pulse: "rgba(245,158,11,0.28)",
    accent: "#fcd34d",
  },
  critical: {
    glow: "rgba(239,68,68,0.55)",
    ring: "#ef4444",
    pulse: "rgba(239,68,68,0.38)",
    accent: "#fca5a5",
  },
};

type NexusRingProps = {
  status: PlatformRingStatus;
  size?: number;
};

export function NexusRing({ status, size = 280 }: NexusRingProps) {
  const styles = STATUS_STYLES[status];
  const center = size / 2;
  const outerRadius = size * 0.42;
  const midRadius = size * 0.34;
  const innerRadius = size * 0.26;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(circle, ${styles.pulse} 0%, transparent 68%)`,
          filter: "blur(8px)",
        }}
      />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-[1]">
        {[1, 0.72, 0.48].map((scale, index) => (
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
            transition={{ duration: 28 + index * 8, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          />
        ))}

        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
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
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
      </svg>

      <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center text-center">
        <motion.p
          className="font-sans text-4xl font-semibold tracking-[0.35em] sm:text-5xl"
          style={{
            color: styles.accent,
            textShadow: `0 0 24px ${styles.glow}, 0 0 48px ${styles.glow}`,
          }}
          animate={{ opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          NEXUS
        </motion.p>
      </div>
    </div>
  );
}
