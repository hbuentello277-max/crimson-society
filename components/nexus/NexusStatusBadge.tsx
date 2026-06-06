type NexusStatusBadgeProps = {
  label: string;
  tone?: "healthy" | "warning" | "critical" | "info" | "neutral";
};

const TONE_CLASSES: Record<NonNullable<NexusStatusBadgeProps["tone"]>, string> = {
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  neutral: "border-white/10 bg-white/5 text-zinc-300",
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

export function NexusStatusBadge({ label, tone }: NexusStatusBadgeProps) {
  const resolvedTone = tone ?? toneFromLabel(label);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${TONE_CLASSES[resolvedTone ?? "neutral"]}`}
    >
      {label}
    </span>
  );
}
