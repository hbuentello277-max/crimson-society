"use client";

import type { ForecastItem } from "@/lib/forecasting/types";

export function ProjectionTimeline({ forecast }: { forecast: ForecastItem }) {
  const points = forecast.timeline;

  return (
    <div className="min-w-0 space-y-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        Current → 30d → 90d → 180d
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TimelineStep label="Current" value={forecast.current_value} active />
        {points.map((point) => (
          <TimelineStep
            key={point.horizon_days}
            label={`${point.horizon_days}d`}
            value={point.display}
          />
        ))}
      </div>

      {forecast.available && points.some((point) => point.numeric_value != null) ? (
        <div className="space-y-2">
          <div className="flex h-2 overflow-hidden rounded-full bg-zinc-900">
            {points.map((point, index) => (
              <div
                key={point.horizon_days}
                className="h-full flex-1 border-r border-black/40 last:border-r-0"
                style={{
                  backgroundColor: `rgba(180, 20, 30, ${0.25 + index * 0.2})`,
                }}
              />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Deterministic linear trend projection
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TimelineStep({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border px-3 py-2 ${
        active
          ? "border-[#b4141e]/35 bg-[#b4141e]/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-sm text-zinc-200">{value}</p>
    </div>
  );
}
