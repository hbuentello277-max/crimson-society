"use client";

import Link from "next/link";
import type { PlanningOpportunity, PlanningRisk } from "@/lib/planning/types";

export function RiskOpportunityPanel({
  risks,
  opportunities,
}: {
  risks: PlanningRisk[];
  opportunities: PlanningOpportunity[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PanelColumn title="Risks" description="Biggest deterministic risk patterns" tone="risk">
        {risks.length === 0 ? (
          <EmptyBlock text="No supported risk patterns detected." />
        ) : (
          risks.map((item) => <PlanningInsightCard key={item.id} item={item} tone="risk" />)
        )}
      </PanelColumn>

      <PanelColumn title="Opportunities" description="Supported growth and engagement opportunities" tone="opportunity">
        {opportunities.length === 0 ? (
          <EmptyBlock text="No supported opportunity patterns detected." />
        ) : (
          opportunities.map((item) => (
            <PlanningInsightCard key={item.id} item={item} tone="opportunity" />
          ))
        )}
      </PanelColumn>
    </div>
  );
}

function PanelColumn({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description: string;
  tone: "risk" | "opportunity";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      <div className={`space-y-3 rounded-2xl border p-3 ${tone === "risk" ? "border-red-500/15" : "border-emerald-500/15"}`}>
        {children}
      </div>
    </section>
  );
}

function PlanningInsightCard({
  item,
  tone,
}: {
  item: PlanningRisk | PlanningOpportunity;
  tone: "risk" | "opportunity";
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/30 p-4">
      <p className="text-sm font-semibold text-white">{item.title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{item.summary}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        <span>{item.category}</span>
        <span>Impact {item.impact_score}</span>
        <span>Confidence {item.confidence_score}</span>
      </div>
      <p className={`mt-3 text-sm ${tone === "risk" ? "text-amber-100" : "text-emerald-100"}`}>
        {item.recommendation}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.related_routes.slice(0, 2).map((route) => (
          <Link
            key={route}
            href={route}
            className="rounded-lg border border-[#b4141e]/25 bg-[#b4141e]/5 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[#f1c3c7]"
          >
            {route.replace("/admin/nexus/", "").replaceAll("-", " ")}
          </Link>
        ))}
      </div>
    </article>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-500">{text}</div>;
}
