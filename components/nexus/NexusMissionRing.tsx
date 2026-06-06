"use client";

type NexusMissionRingProps = {
  score: number | null | undefined;
  status?: string;
  size?: number;
};

export function NexusMissionRing({ score, status = "unknown", size = 88 }: NexusMissionRingProps) {
  const normalized = typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  const tone =
    normalized >= 80
      ? "#22c55e"
      : normalized >= 55
        ? "#f59e0b"
        : normalized >= 30
          ? "#ef4444"
          : "#b4141e";

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {[0.33, 0.66, 1].map((scale) => (
          <circle
            key={scale}
            cx={size / 2}
            cy={size / 2}
            r={radius * scale}
            fill="none"
            stroke="rgba(180,20,30,0.15)"
            strokeWidth="0.5"
          />
        ))}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(180,20,30,0.25)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="drop-shadow-[0_0_6px_rgba(180,20,30,0.5)]"
        />
        <g
          className="origin-center animate-[spin_6s_linear_infinite]"
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2}
            y2={size / 2 - radius + 6}
            stroke="rgba(180,20,30,0.55)"
            strokeWidth="1"
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-lg font-semibold leading-none text-white">
          {typeof score === "number" && Number.isFinite(score) ? score : "—"}
        </p>
        <p className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-zinc-500">Mission</p>
        <p className="mt-0.5 max-w-[70%] truncate text-[7px] capitalize text-[#e87a82]">{status}</p>
      </div>
    </div>
  );
}
