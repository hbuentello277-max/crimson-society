"use client";

const BREAKDOWN_LABELS: Record<string, string> = {
  growth: "Growth",
  engagement: "Engagement",
  revenue: "Revenue",
  operational_health: "Operational Health",
  workflow_health: "Workflow Health",
  incidents: "Incidents",
  alerts: "Alerts",
  opportunities: "Opportunities",
};

export function MissionScoreCard({
  missionScore,
  scoreBreakdown,
}: {
  missionScore: number;
  scoreBreakdown: Record<string, number>;
}) {
  const entries = Object.entries(scoreBreakdown).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return (
    <section className="rounded-2xl border border-[#b4141e]/20 bg-black/40 p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Mission Score</p>
          <p className="mt-1 text-xs text-zinc-500">Deterministic weighted composite — no AI</p>
        </div>
        <p className="text-3xl font-semibold tabular-nums text-white">{missionScore}</p>
      </div>

      <div className="mt-4 space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-zinc-400">{BREAKDOWN_LABELS[key] ?? key}</span>
                <span
                  className={`tabular-nums ${value < 0 ? "text-amber-400" : value > 0 ? "text-emerald-400" : "text-zinc-500"}`}
                >
                  {value > 0 ? `+${value}` : value}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${value < 0 ? "bg-amber-500/60" : "bg-[#b4141e]/70"}`}
                  style={{ width: `${Math.min(100, Math.abs(value) * 4)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
