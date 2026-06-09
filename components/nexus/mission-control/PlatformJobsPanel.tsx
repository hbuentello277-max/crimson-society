"use client";

import type { PlatformJobHealthView, PlatformJobsSummaryView } from "@/lib/mission-control/types";
import { formatDateTime, formatRelativeTime } from "@/lib/nexus/format";
import { NEXUS_LABELS } from "@/lib/nexus/terminology";
import { NexusListEmpty } from "@/components/nexus/NexusShared";

const STATUS_STYLES: Record<
  PlatformJobHealthView["status"],
  { label: string; className: string }
> = {
  healthy: {
    label: "Healthy",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "border-red-500/40 bg-red-500/10 text-red-200",
  },
  overdue: {
    label: "Overdue",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  never_run: {
    label: "Never run",
    className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  },
  unknown: {
    label: "Unknown",
    className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  },
};

const OVERALL_STYLES: Record<
  PlatformJobsSummaryView["overall_status"],
  { label: string; className: string }
> = {
  healthy: {
    label: "All platform jobs healthy",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  degraded: {
    label: "Platform jobs need attention",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  critical: {
    label: "Platform job failures detected",
    className: "border-red-500/40 bg-red-500/10 text-red-200",
  },
  unknown: {
    label: "Platform job status unknown",
    className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  },
};

function formatDuration(durationMs: number | null): string {
  if (durationMs == null) {
    return "—";
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function PlatformJobsPanel({ summary }: { summary: PlatformJobsSummaryView }) {
  const overall = OVERALL_STYLES[summary.overall_status];

  return (
    <section className="rounded-2xl border border-[#b4141e]/20 bg-black/40 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">
            {NEXUS_LABELS.platformJobs}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Scheduled NEXUS collectors from activity logs — last run, duration, and next expected
            execution.
          </p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${overall.className}`}
        >
          {overall.label}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <SummaryChip label="Healthy" value={summary.healthy_count} />
        <SummaryChip label="Failed" value={summary.failed_count} />
        <SummaryChip label="Overdue" value={summary.overdue_count} />
        <SummaryChip label="Never run" value={summary.never_run_count} />
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Last NEXUS activity:{" "}
        {summary.last_nexus_run_at
          ? `${formatRelativeTime(summary.last_nexus_run_at) || formatDateTime(summary.last_nexus_run_at)}`
          : "No recent activity logged"}
      </p>

      {summary.jobs.length === 0 ? (
        <div className="mt-4">
          <NexusListEmpty
            title="No platform job data"
            description="Cron activity will appear after the first scheduled run."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {summary.jobs.map((job) => (
            <JobRow key={job.slug} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function JobRow({ job }: { job: PlatformJobHealthView }) {
  const status = STATUS_STYLES[job.status];

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-white">{job.label}</p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {job.path} · schedule {job.schedule}
          </p>
          {job.error_message ? (
            <p className="mt-2 text-sm leading-6 text-red-300">{job.error_message}</p>
          ) : null}
        </div>

        <div className="grid shrink-0 gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:min-w-[18rem]">
          <Metric label="Last run" value={formatJobTime(job.last_run_at)} />
          <Metric label="Duration" value={formatDuration(job.duration_ms)} />
          <Metric label="Next expected" value={formatJobTime(job.next_expected_at)} />
          <Metric label="Last success" value={formatJobTime(job.last_success_at)} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">{label}</p>
      <p className="mt-1 text-zinc-300">{value}</p>
    </div>
  );
}

function formatJobTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return formatRelativeTime(value) || formatDateTime(value);
}
