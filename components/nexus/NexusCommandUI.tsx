"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";

export function NexusOverviewMetricCard({
  label,
  value,
  href,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  tone?: "default" | "critical" | "warning" | "healthy" | "revenue";
  icon?: ReactNode;
}) {
  const borderClass =
    tone === "critical"
      ? "border-l-red-500/70"
      : tone === "warning"
        ? "border-l-amber-500/70"
        : tone === "healthy"
          ? "border-l-emerald-500/70"
          : tone === "revenue"
            ? "border-l-violet-500/70"
            : "border-l-[#b4141e]/50";

  const inner = (
    <div
      className={`flex min-h-[88px] flex-col justify-between rounded-xl border border-[#b4141e]/20 border-l-[3px] bg-[#0a0608]/95 p-4 transition ${borderClass} ${
        href ? "hover:border-[#b4141e]/40 hover:bg-[#b4141e]/5" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">{label}</p>
        {icon ? <span className="text-zinc-500">{icon}</span> : null}
      </div>
      <p className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl">{value}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }

  return inner;
}

export function NexusStatusChip({
  label,
  value,
  href,
  pulse,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  href?: string;
  pulse?: boolean;
  tone?: "default" | "critical" | "warning" | "healthy";
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-500/40 bg-red-500/10"
      : tone === "warning"
        ? "border-amber-500/35 bg-amber-500/10"
        : tone === "healthy"
          ? "border-emerald-500/35 bg-emerald-500/10"
          : "border-[#b4141e]/30 bg-black/50";

  const content = (
    <div
      className={`flex min-w-[5.5rem] shrink-0 flex-col rounded-xl border px-3 py-2.5 ${toneClass}`}
    >
      <div className="flex items-center gap-1.5">
        {pulse ? (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b4141e] opacity-70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#b4141e]" />
          </span>
        ) : null}
        <span className="truncate text-[9px] uppercase tracking-[0.14em] text-[#e87a82]">
          {label}
        </span>
      </div>
      <span className="mt-1 truncate text-sm font-semibold leading-tight text-white">{value}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition hover:brightness-110">
        {content}
      </Link>
    );
  }

  return content;
}

export function NexusDensePanel({
  title,
  href,
  children,
  className = "",
  bodyClassName = "",
  defaultOpen = true,
  collapsible = false,
  headerAction,
}: {
  title: string;
  href?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  headerAction?: ReactNode;
}) {
  const headerRight = (
    <div className="flex items-center gap-3">
      {headerAction}
      {href ? (
        <Link
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="min-h-8 inline-flex items-center text-[10px] uppercase tracking-[0.12em] text-zinc-500 transition hover:text-[#f1c3c7]"
        >
          Open
        </Link>
      ) : null}
      {collapsible ? (
        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 group-open:hidden">
          Open
        </span>
      ) : null}
      {collapsible ? (
        <span className="hidden text-[10px] uppercase tracking-[0.12em] text-zinc-500 group-open:inline">
          Close
        </span>
      ) : null}
    </div>
  );

  if (collapsible) {
    return (
      <details
        open={defaultOpen}
        className={`group overflow-hidden rounded-xl border border-[#b4141e]/25 bg-[#060405]/90 ${className}`}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between border-b border-[#b4141e]/15 px-4 py-3 marker:content-none">
          <span className="text-[11px] uppercase tracking-[0.22em] text-[#e87a82]">{title}</span>
          {headerRight}
        </summary>
        <div className={`min-h-0 p-4 ${bodyClassName}`}>{children}</div>
      </details>
    );
  }

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#b4141e]/25 bg-[#060405]/90 ${className}`}
    >
      <div className="flex min-h-12 shrink-0 items-center justify-between border-b border-[#b4141e]/15 px-4 py-3">
        <span className="text-[11px] uppercase tracking-[0.22em] text-[#e87a82]">{title}</span>
        {headerRight}
      </div>
      <div className={`min-h-0 flex-1 p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function NexusIntegrationCard({
  name,
  latency,
  status,
  checkedAt,
  errorMessage,
  degraded,
}: {
  name: string;
  latency: ReactNode;
  status: string;
  checkedAt: string;
  errorMessage?: string | null;
  degraded: boolean;
}) {
  return (
    <div
      className={`flex min-h-[96px] flex-col justify-between rounded-xl border p-3.5 ${
        degraded
          ? "border-amber-500/25 bg-amber-500/[0.04]"
          : "border-[#b4141e]/15 bg-[#0a0608]/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white">{name}</p>
        <NexusStatusBadge label={status} variant="subtle" />
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-lg font-semibold text-white">{latency}</p>
        <p className="text-[10px] text-zinc-500">{checkedAt}</p>
        {degraded && errorMessage ? (
          <p className="line-clamp-2 text-[10px] leading-snug text-red-400/90">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

export function NexusActivityTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-[72px] flex-col justify-center rounded-xl border border-[#b4141e]/15 bg-[#0a0608]/80 px-3 py-3 text-center">
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
    </div>
  );
}

export function NexusInsightCard({
  title,
  summary,
  tone = "neutral",
}: {
  title: string;
  summary?: string;
  tone?: "healthy" | "warning" | "revenue" | "neutral";
}) {
  const iconClass =
    tone === "healthy"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : tone === "revenue"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
          : "border-[#b4141e]/30 bg-[#b4141e]/10 text-[#e87a82]";

  return (
    <div className="flex w-[min(100%,260px)] shrink-0 gap-3 rounded-xl border border-[#b4141e]/20 bg-[#0a0608]/90 p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${iconClass}`}
      >
        <span className="text-sm">●</span>
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-white">{title}</p>
        {summary ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{summary}</p>
        ) : null}
      </div>
    </div>
  );
}

export function NexusQueueSlot({
  label,
  empty,
  icon,
}: {
  label: string;
  empty: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-[80px] flex-1 flex-col items-center justify-center rounded-xl border border-[#b4141e]/15 bg-[#0a0608]/60 px-4 py-4 text-center">
      <span className="mb-2 text-zinc-600">{icon}</span>
      <p className="text-xs text-zinc-500">{empty ? `No open ${label}` : label}</p>
    </div>
  );
}

export function NexusFeedRow({
  title,
  meta,
  time,
  severity,
}: {
  title: string;
  meta?: string;
  time?: string;
  severity?: string;
}) {
  return (
    <div className="flex gap-2 border-b border-[#b4141e]/10 py-2.5 last:border-0">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b4141e]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {severity ? <NexusStatusBadge label={severity} variant="subtle" /> : null}
          {meta ? (
            <span className="truncate text-[9px] uppercase tracking-[0.1em] text-zinc-600">
              {meta}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm text-zinc-300">{title}</p>
      </div>
      {time ? <span className="shrink-0 text-[10px] text-zinc-600">{time}</span> : null}
    </div>
  );
}

export function NexusMicroRow({
  label,
  value,
  badge,
  alert,
}: {
  label: string;
  value?: ReactNode;
  badge?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
        alert ? "border border-amber-500/20 bg-amber-500/[0.04]" : "bg-black/30"
      }`}
    >
      <span className="truncate text-sm text-zinc-300">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        {value != null ? <span className="text-sm font-medium text-white">{value}</span> : null}
        {badge ? <NexusStatusBadge label={badge} variant="subtle" /> : null}
      </div>
    </div>
  );
}
