type NexusStatusBadgeProps = {
  label: string;
  tone?: "healthy" | "warning" | "critical" | "info" | "neutral";
  variant?: "default" | "subtle";
};

const TONE_CLASSES: Record<NonNullable<NexusStatusBadgeProps["tone"]>, string> = {
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  neutral: "border-white/10 bg-white/5 text-zinc-300",
};

const SUBTLE_TONE_CLASSES: Record<NonNullable<NexusStatusBadgeProps["tone"]>, string> = {
  healthy: "text-emerald-400/90",
  warning: "text-amber-400/90",
  critical: "text-red-400/90",
  info: "text-sky-400/90",
  neutral: "text-zinc-400",
};

const SUBTLE_DOT_CLASSES: Record<NonNullable<NexusStatusBadgeProps["tone"]>, string> = {
  healthy: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-red-400",
  info: "bg-sky-400",
  neutral: "bg-zinc-500",
};

function toneFromLabel(label: string): NexusStatusBadgeProps["tone"] {
  const normalized = label.toLowerCase();
  if (
    ["healthy", "nominal", "pass", "ready", "active", "open"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return "healthy";
  }

  if (
    ["degraded", "warning", "investigating", "mitigated", "impaired"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return "warning";
  }

  if (
    ["critical", "down", "failing", "error", "blocked"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return "critical";
  }

  return "neutral";
}

export function NexusStatusBadge({ label, tone, variant = "default" }: NexusStatusBadgeProps) {
  const resolvedTone = tone ?? toneFromLabel(label);

  if (variant === "subtle") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] capitalize tracking-wide ${SUBTLE_TONE_CLASSES[resolvedTone ?? "neutral"]}`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${SUBTLE_DOT_CLASSES[resolvedTone ?? "neutral"]}`}
        />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${TONE_CLASSES[resolvedTone ?? "neutral"]}`}
    >
      {label}
    </span>
  );
}
