"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { NexusEmptyState } from "@/components/nexus/NexusEmptyState";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";

export const NEXUS_FRAME_CLASS =
  "overflow-hidden rounded-lg border border-[#b4141e]/35 bg-[#060405]/95 shadow-[0_0_32px_rgba(180,20,30,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]";

export const NEXUS_PANEL_CLASS =
  "border-[#b4141e]/15 bg-[#080506]/80";

export const NEXUS_STAT_CARD_CLASS =
  "rounded-md border border-[#b4141e]/25 bg-[#0a0608]/90 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";

export function NexusCommandFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${NEXUS_FRAME_CLASS} ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none h-px bg-gradient-to-r from-transparent via-[#b4141e]/60 to-transparent"
      />
      {children}
    </div>
  );
}

export function NexusPanelHeader({
  title,
  href,
  action,
}: {
  title: string;
  href?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#b4141e]/15 px-3 py-2">
      <h2 className="text-[9px] uppercase tracking-[0.26em] text-[#e87a82]">{title}</h2>
      <div className="flex items-center gap-2">
        {action}
        {href ? (
          <Link
            href={href}
            className="text-[9px] uppercase tracking-[0.16em] text-zinc-500 transition hover:text-[#f1c3c7]"
          >
            Open
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function NexusLiveIndicator() {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white sm:text-[11px]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b4141e] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b4141e]" />
      </span>
      Live
    </span>
  );
}

export function NexusCommandPanel({
  title,
  href,
  children,
  className = "",
  action,
}: {
  title: string;
  href?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`${NEXUS_PANEL_CLASS} ${className}`}>
      <NexusPanelHeader title={title} href={href} action={action} />
      <div className="p-3">{children}</div>
    </section>
  );
}

export function NexusStatCard({
  label,
  value,
  sublabel,
  href,
  badge,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  href?: string;
  badge?: ReactNode;
  compact?: boolean;
}) {
  const inner = (
    <>
      <p className="truncate text-[8px] uppercase tracking-[0.2em] text-[#e87a82] sm:text-[9px]">
        {label}
      </p>
      <div className={`mt-1 flex items-center gap-1.5 ${compact ? "" : "flex-wrap"}`}>
        <p className={`font-semibold text-white ${compact ? "text-base sm:text-lg" : "text-2xl md:text-3xl"}`}>
          {value}
        </p>
        {badge}
      </div>
      {sublabel ? (
        <p className="mt-0.5 truncate text-[8px] uppercase tracking-[0.12em] text-zinc-500 sm:text-[9px]">
          {sublabel}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${NEXUS_STAT_CARD_CLASS} block transition hover:border-[#b4141e]/50 hover:bg-[#b4141e]/5`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={NEXUS_STAT_CARD_CLASS}>{inner}</div>;
}

export function NexusMiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "critical" | "warning";
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-500/30 bg-red-500/5"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-[#b4141e]/20 bg-black/40";

  return (
    <div className={`rounded-md border px-2 py-1.5 text-center ${toneClass}`}>
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
    </div>
  );
}

export function NexusRefreshButton({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={`inline-flex items-center gap-1 rounded-lg border border-[#b4141e]/40 bg-black/50 font-medium uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10 ${
        compact
          ? "min-h-9 px-2.5 py-1.5 text-[9px]"
          : "min-h-10 gap-1.5 px-4 py-2 text-[10px] tracking-[0.16em]"
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M13 3v3H10M3 13V10h3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.5 6.5A5 5 0 0 0 4 4.5M3.5 9.5A5 5 0 0 0 12 11.5" strokeLinecap="round" />
      </svg>
      Sync
    </button>
  );
}

export function NexusSectionFrame({
  title,
  description,
  loading,
  error,
  onRefresh,
  action,
  children,
}: {
  title: string;
  description?: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-white md:text-3xl">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {action}
          <NexusRefreshButton onClick={() => void onRefresh()} />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? <NexusLoadingPanel /> : children}
    </section>
  );
}

export function NexusLoadingPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-[#b4141e]/20 bg-[#080506]/80 p-5"
        >
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="mt-4 h-5 w-2/3 rounded-full bg-white/10" />
          <div className="mt-3 h-4 w-full rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function NexusMetricCard({
  label,
  value,
  hint,
  href,
  badge,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  badge?: ReactNode;
}) {
  const content = (
    <>
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{label}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <p className="text-3xl font-semibold text-white md:text-4xl">{value}</p>
        {badge}
      </div>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:border-[#b4141e]/40 hover:bg-[#b4141e]/5"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-2xl border border-white/10 bg-black/30 p-5">{content}</div>;
}

export function NexusTabFilter<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const active = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition ${
              active
                ? "border-[#b4141e]/60 bg-[#b4141e]/15 text-[#f1c3c7]"
                : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" ? ` (${tab.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}

export function NexusActionButton({
  label,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const classes =
    variant === "primary"
      ? "border-[#b4141e]/50 bg-[#b4141e]/20 text-[#f1c3c7] hover:border-[#b4141e]/80 hover:bg-[#b4141e]/30"
      : variant === "danger"
        ? "border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-500/50"
        : "border-white/10 text-zinc-300 hover:border-[#b4141e]/50 hover:text-[#f1c3c7]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className={`rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
    >
      {label}
    </button>
  );
}

export function NexusPriorityBadge({ tier }: { tier?: string | null }) {
  if (!tier) {
    return null;
  }

  const tone =
    tier === "critical"
      ? "critical"
      : tier === "high"
        ? "warning"
        : tier === "medium"
          ? "info"
          : "neutral";

  return <NexusStatusBadge label={tier} tone={tone} />;
}

export function NexusConfidenceIndicator({ value }: { value: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tone =
    percent >= 80 ? "bg-emerald-500" : percent >= 55 ? "bg-amber-400" : "bg-red-500";

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        <span>Confidence</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function NexusPanel({
  title,
  children,
  footer,
}: {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={`${NEXUS_PANEL_CLASS} p-4 md:p-5`}>
      {title ? <h3 className="mb-4 font-medium text-white">{title}</h3> : null}
      {children}
      {footer ? <div className="mt-4 border-t border-[#b4141e]/15 pt-4">{footer}</div> : null}
    </div>
  );
}

export function NexusOverviewSection({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#b4141e]/20 bg-[#0a0607]/80 p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-white md:text-2xl">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82] transition hover:text-[#f1c3c7]"
          >
            View all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function NexusListEmpty({ title, description }: { title: string; description?: string }) {
  return <NexusEmptyState title={title} description={description} />;
}
