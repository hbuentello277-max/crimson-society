"use client";

import type { MonthlyExecutiveReport } from "@/lib/reports/types";
import { formatDateTime } from "@/lib/nexus/format";
import { NEXUS_PANEL_CLASS } from "@/components/nexus/NexusShared";

const PANEL_CLASS = `${NEXUS_PANEL_CLASS} rounded-2xl border border-white/10 bg-black/25 p-4`;

function ReportBlock({
  title,
  headline,
  bullets,
}: {
  title: string;
  headline: string;
  bullets: string[];
}) {
  return (
    <div className={PANEL_CLASS}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">{title}</p>
      <p className="mt-2 text-sm font-medium text-white">{headline}</p>
      <ul className="mt-3 space-y-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2 text-sm text-zinc-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b4141e]/80" aria-hidden />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthlyReportPanel({ report }: { report: MonthlyExecutiveReport }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Monthly Report</p>
        <p className="mt-1 text-xs text-zinc-500">
          {formatDateTime(report.period_start)} → {formatDateTime(report.period_end)}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ReportBlock title="Total Growth" headline={report.total_growth.headline} bullets={report.total_growth.bullets} />
        <ReportBlock title="Revenue" headline={report.revenue_summary.headline} bullets={report.revenue_summary.bullets} />
        <ReportBlock title="Engagement" headline={report.engagement_summary.headline} bullets={report.engagement_summary.bullets} />
        <ReportBlock title="Operations" headline={report.operational_summary.headline} bullets={report.operational_summary.bullets} />
      </div>

      {report.risks.length > 0 ? (
        <div className={`${PANEL_CLASS} border-amber-500/20 bg-amber-500/5`}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-200/80">Risks</p>
          <ul className="mt-3 space-y-2">
            {report.risks.map((risk) => (
              <li key={risk} className="text-sm text-amber-100/90">
                {risk}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={PANEL_CLASS}>
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">Recommended Owner Focus</p>
        <ul className="mt-3 space-y-2">
          {report.recommended_owner_focus.map((item) => (
            <li key={item} className="text-sm text-zinc-300">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
