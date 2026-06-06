"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";

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
    <div className={`flex min-w-[4.5rem] shrink-0 flex-col rounded border px-2 py-1 ${toneClass}`}>
      <div className="flex items-center gap-1">
        {pulse ? (
          <span className="relative flex h-1 w-1">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b4141e] opacity-70" />
            <span className="relative h-1 w-1 rounded-full bg-[#b4141e]" />
          </span>
        ) : null}
        <span className="truncate text-[7px] uppercase tracking-[0.14em] text-[#e87a82]">{label}</span>
      </div>
      <span className="truncate text-xs font-semibold leading-tight text-white">{value}</span>
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
}: {
  title: string;
  href?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  if (collapsible) {
    return (
      <details
        open={defaultOpen}
        className={`group overflow-hidden rounded border border-[#b4141e]/25 bg-[#060405]/90 ${className}`}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between border-b border-[#b4141e]/15 px-2 py-1.5 marker:content-none">
          <span className="text-[8px] uppercase tracking-[0.22em] text-[#e87a82]">{title}</span>
          <div className="flex items-center gap-2">
            {href ? (
              <Link
                href={href}
                onClick={(event) => event.stopPropagation()}
                className="text-[8px] uppercase tracking-[0.12em] text-zinc-500 hover:text-[#f1c3c7]"
              >
                Open
              </Link>
            ) : null}
            <span className="text-[8px] text-zinc-600 group-open:rotate-180">▼</span>
          </div>
        </summary>
        <div className={`min-h-0 p-1.5 ${bodyClassName}`}>{children}</div>
      </details>
    );
  }

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded border border-[#b4141e]/25 bg-[#060405]/90 ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[#b4141e]/15 px-2 py-1">
        <span className="text-[8px] uppercase tracking-[0.22em] text-[#e87a82]">{title}</span>
        {href ? (
          <Link
            href={href}
            className="text-[8px] uppercase tracking-[0.12em] text-zinc-500 hover:text-[#f1c3c7]"
          >
            Open
          </Link>
        ) : null}
      </div>
      <div className={`min-h-0 flex-1 p-1.5 ${bodyClassName}`}>{children}</div>
    </section>
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
    <div className="flex gap-1.5 border-b border-[#b4141e]/10 py-1 last:border-0">
      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#b4141e]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {severity ? <NexusStatusBadge label={severity} /> : null}
          {meta ? (
            <span className="truncate text-[7px] uppercase tracking-[0.1em] text-zinc-600">
              {meta}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-1 text-[10px] text-zinc-300">{title}</p>
      </div>
      {time ? <span className="shrink-0 text-[8px] text-zinc-600">{time}</span> : null}
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
      className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-[10px] ${
        alert ? "border border-red-500/25 bg-red-500/10" : "bg-black/30"
      }`}
    >
      <span className="truncate text-zinc-400">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        {value != null ? <span className="text-zinc-500">{value}</span> : null}
        {badge ? <NexusStatusBadge label={badge} /> : null}
      </div>
    </div>
  );
}
