import type { RideTrackingStatus } from "@/types/rides";

type TrackerControlsProps = {
  status: RideTrackingStatus;
  onPause: () => void;
  onReset: () => void;
  onStart: () => void;
  onStop: () => void;
};

export function TrackerControls({
  status,
  onPause,
  onReset,
  onStart,
  onStop,
}: TrackerControlsProps) {
  const isActive = status === "active";
  const isRequesting = status === "requesting";
  const canStop = status === "active" || status === "paused";
  const canReset = status !== "idle" && status !== "requesting";

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button
        type="button"
        onClick={onStart}
        disabled={isActive || isRequesting}
        className="rounded-lg border border-[#8d1622] bg-[#7f111b] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#fff7f7] transition hover:bg-[#941824] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
      >
        {status === "paused" ? "Resume Ride" : isRequesting ? "Requesting GPS" : "Start Ride"}
      </button>

      <button
        type="button"
        onClick={onPause}
        disabled={!isActive}
        className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-zinc-200 transition hover:border-[#7f111b]/60 hover:bg-[#7f111b]/15 disabled:cursor-not-allowed disabled:text-zinc-600"
      >
        Pause Ride
      </button>

      <button
        type="button"
        onClick={onStop}
        disabled={!canStop}
        className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-zinc-200 transition hover:border-[#7f111b]/60 hover:bg-[#7f111b]/15 disabled:cursor-not-allowed disabled:text-zinc-600"
      >
        Stop Ride
      </button>

      <button
        type="button"
        onClick={onReset}
        disabled={!canReset}
        className="rounded-lg border border-white/10 bg-transparent px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:text-zinc-700"
      >
        Reset Ride
      </button>
    </section>
  );
}
