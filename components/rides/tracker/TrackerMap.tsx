"use client";

import dynamic from "next/dynamic";
import type { RideTrackingPoint } from "@/types/rides";

const RideMap = dynamic(() => import("@/components/RideMap"), {
  ssr: false,
  loading: () => <MapPlaceholder pointCount={0} statusLabel="Loading map" />,
});

type TrackerMapProps = {
  points: RideTrackingPoint[];
  statusLabel: string;
};

function MapPlaceholder({
  pointCount,
  statusLabel,
}: {
  pointCount: number;
  statusLabel: string;
}) {
  return (
    <div className="relative h-[300px] overflow-hidden rounded-lg border border-white/10 bg-[#090607] sm:h-[380px]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(127,17,27,0.32),transparent_54%),linear-gradient(145deg,#12080a_0%,#050405_58%,#15080b_100%)]" />
      <div className="absolute inset-x-8 top-12 h-px bg-[#7f111b]/55" />
      <div className="absolute inset-x-14 top-28 h-px bg-white/10" />
      <div className="absolute inset-x-10 bottom-20 h-px bg-[#7f111b]/35" />
      <div className="absolute bottom-10 left-10 top-10 w-px bg-white/10" />
      <div className="absolute bottom-14 right-16 top-8 w-px bg-[#7f111b]/40" />
      <div className="absolute left-[18%] top-[46%] h-3 w-3 rounded-full border border-[#f0c9ce] bg-[#8d1622] shadow-[0_0_0_8px_rgba(127,17,27,0.18),0_0_34px_rgba(176,31,45,0.38)]" />
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
        <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-300">
          {statusLabel}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#d85f6c]">
          {pointCount} GPS points
        </span>
      </div>
    </div>
  );
}

export function TrackerMap({ points, statusLabel }: TrackerMapProps) {
  const currentPoint = points.at(-1);

  if (!currentPoint) {
    return <MapPlaceholder pointCount={points.length} statusLabel={statusLabel} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
      <RideMap
        lat={currentPoint.lat}
        lng={currentPoint.lng}
        meetPoint="Current position"
        route={points}
        editable={false}
        height={360}
      />
    </div>
  );
}
