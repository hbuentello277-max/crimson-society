const INTEGRATION_LABELS: Record<string, string> = {
  supabase: "Supabase",
  stripe: "Stripe",
  github: "GitHub",
  vercel: "Vercel",
  resend: "Resend",
  crimson_society: "Crimson Society",
};

export function integrationDisplayName(slug: string) {
  return INTEGRATION_LABELS[slug] ?? slug.replaceAll("_", " ");
}

export function formatNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString();
}

export function formatCurrency(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatDateTime(value: unknown) {
  if (!value || typeof value !== "string") {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTime(value: unknown) {
  if (!value || typeof value !== "string") {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const deltaMs = date.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(deltaMs) / 60_000);

  if (absMinutes < 1) {
    return "just now";
  }

  if (absMinutes < 60) {
    return deltaMs < 0 ? `${absMinutes}m ago` : `in ${absMinutes}m`;
  }

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 48) {
    return deltaMs < 0 ? `${absHours}h ago` : `in ${absHours}h`;
  }

  return formatDateTime(value);
}

export function isWithinHours(value: unknown, hours: number) {
  if (!value || typeof value !== "string") {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() - date.getTime() <= hours * 60 * 60 * 1000;
}

export function evidenceCount(evidence: Record<string, unknown> | null | undefined, linked = 0) {
  const inline = evidence ? Object.keys(evidence).length : 0;
  return inline + linked;
}
