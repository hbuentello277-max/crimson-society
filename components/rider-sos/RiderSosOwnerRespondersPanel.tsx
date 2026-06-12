"use client";

import { formatResponseStatusLabel } from "@/lib/rider-sos/response-format";
import type { RiderSosResponderView } from "@/lib/rider-sos/response-types";

type Props = {
  responders: RiderSosResponderView[];
  loading?: boolean;
  error?: string | null;
};

export function RiderSosOwnerRespondersPanel({ responders, loading = false, error }: Props) {
  if (loading) {
    return (
      <div className="mt-5 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
      </div>
    );
  }

  if (error) {
    return <p className="mt-5 text-xs text-red-300">{error}</p>;
  }

  if (responders.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        <p className="text-sm text-zinc-400">
          Nearby riders can volunteer from the SOS alert. You&apos;ll see responders here when someone
          taps &quot;I&apos;m Responding&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">Help is on the way</p>

      <div className="space-y-2">
        {responders.map((responder) => (
          <article
            key={responder.id}
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{responder.rider_name}</p>
                {responder.bike_info ? (
                  <p className="mt-1 truncate text-sm text-zinc-400">{responder.bike_info}</p>
                ) : null}
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] ${
                  responder.status === "arrived"
                    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
                    : "border-[#b4141e]/35 bg-[#b4141e]/10 text-[#e87a82]"
                }`}
              >
                {formatResponseStatusLabel(responder.status)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
