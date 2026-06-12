"use client";

import { CS_CTA_PRIMARY_LG } from "@/lib/crimson-accent";
import {
  formatResponseStatusLabel,
  formatSosDistanceSummary,
  formatSosResponseEtaLine,
} from "@/lib/rider-sos/response-format";
import type { RiderSosResponseStatus } from "@/lib/rider-sos/response-types";

type Props = {
  loading?: boolean;
  submitting?: boolean;
  error?: string | null;
  status: RiderSosResponseStatus | null;
  etaMinutes?: number | null;
  distanceMiles?: number | null;
  onRespond: () => void;
  onMarkArrived: () => void;
  onCancel: () => void;
};

export function RiderSosResponseControls({
  loading = false,
  submitting = false,
  error,
  status,
  etaMinutes,
  distanceMiles,
  onRespond,
  onMarkArrived,
  onCancel,
}: Props) {
  const isActive = status === "responding" || status === "arrived";

  if (loading) {
    return <div className="mt-5 h-12 animate-pulse rounded-full bg-white/10" />;
  }

  return (
    <div className="mt-5 space-y-3">
      <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">🚨 Rider Needs Assistance</p>

      {!isActive ? (
        <button
          type="button"
          onClick={onRespond}
          disabled={submitting}
          className={`w-full ${CS_CTA_PRIMARY_LG} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {submitting ? "Saving..." : "I'm Responding"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-medium text-emerald-100">
              ✅ {formatResponseStatusLabel(status!)}
            </p>
            {status === "responding" ? (
              <>
                <p className="mt-1 text-sm text-emerald-50">
                  {formatSosResponseEtaLine({ status, etaMinutes })}
                </p>
                <p className="mt-0.5 text-xs text-emerald-100/70">
                  {formatSosDistanceSummary(distanceMiles)}
                </p>
              </>
            ) : null}
          </div>

          {status === "responding" ? (
            <button
              type="button"
              onClick={onMarkArrived}
              disabled={submitting}
              className={`w-full ${CS_CTA_PRIMARY_LG} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {submitting ? "Saving..." : "Mark Arrived"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm uppercase tracking-[0.24em] text-zinc-300 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel Response
          </button>
        </div>
      )}

      {error ? <p className="text-xs uppercase tracking-[0.2em] text-red-400">{error}</p> : null}
    </div>
  );
}
