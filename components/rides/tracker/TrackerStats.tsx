import { formatMeetDuration } from "@/lib/meets/tracking";
import type { NavigationTrackingStats } from "@/types/meets";

type TrackerStatsProps = {
  stats: NavigationTrackingStats;
};

function formatSpeed(value: number) {
  return value < 10 ? value.toFixed(1) : value.toFixed(0);
}

function formatDistance(value: number) {
  return value < 10 ? value.toFixed(2) : value.toFixed(1);
}

export function TrackerStats({ stats }: TrackerStatsProps) {
  const items = [
    { label: "Current", value: formatSpeed(stats.currentSpeedMph), unit: "mph" },
    { label: "Top", value: formatSpeed(stats.topSpeedMph), unit: "mph" },
    { label: "Average", value: formatSpeed(stats.averageSpeedMph), unit: "mph" },
    { label: "Distance", value: formatDistance(stats.distanceMiles), unit: "mi" },
    { label: "Duration", value: formatMeetDuration(stats.durationMs), unit: "" },
  ];

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-3 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.95)]"
        >
          <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
          <div className="mt-1.5 flex min-h-8 items-baseline gap-1">
            <span className="font-serif text-[30px] leading-none text-[#f4f0ea] sm:text-[28px]">
              {item.value}
            </span>
            {item.unit && (
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#d85f6c]">
                {item.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
