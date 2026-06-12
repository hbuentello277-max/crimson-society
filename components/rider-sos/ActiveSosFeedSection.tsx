"use client";

import Link from "next/link";
import {
  formatSosDistanceMiles,
  formatSosTimeAgo,
  riderSosDisplayName,
} from "@/lib/rider-sos/nearby-format";
import type { NearbyRiderSosAlert } from "@/lib/rider-sos/nearby-types";
import { RIDER_SOS_NEARBY_RADIUS_MILES } from "@/lib/rider-sos/nearby-config";
import { sosTypeLabel } from "@/lib/rider-sos/sos-types";

type Props = {
  alerts: NearbyRiderSosAlert[];
  loading?: boolean;
  error?: string | null;
  locationNote?: string | null;
};

function ActiveSosCard({ alert }: { alert: NearbyRiderSosAlert }) {
  return (
    <article className="rounded-[22px] border border-[#b4141e]/35 bg-gradient-to-r from-[#b4141e]/12 via-[#120608] to-[#090909] p-4 shadow-[0_16px_40px_-32px_rgba(180,20,30,0.75)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#e87a82]">
        🚨 Rider Needs Assistance
      </p>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-xl text-white">{riderSosDisplayName(alert)}</h3>
          <p className="mt-1 text-sm text-zinc-300">{sosTypeLabel(alert.sos_type)}</p>
          <p className="mt-2 text-xs text-zinc-500">{formatSosDistanceMiles(alert.distance_miles)}</p>
          <p className="mt-1 text-xs text-zinc-500">{formatSosTimeAgo(alert.created_at)}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[#b4141e]/45 bg-[#b4141e]/15 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[#e87a82]">
          Active
        </span>
      </div>

      <Link
        href={`/rider-sos/alerts/${alert.id}`}
        className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#e87a82] transition hover:border-[#b4141e]/50 hover:bg-[#b4141e]/10"
      >
        View Details
      </Link>
    </article>
  );
}

export function ActiveSosFeedSection({ alerts, loading = false, error, locationNote }: Props) {
  if (!loading && !error && alerts.length === 0) {
    return null;
  }

  return (
    <section className="mb-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">Rider SOS</p>
          <h2 className="mt-1 font-serif text-2xl text-white">Active Rider SOS</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Nearby alerts within {RIDER_SOS_NEARBY_RADIUS_MILES} miles from riders who need help.
          </p>
        </div>
      </div>

      {locationNote ? (
        <p className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {locationNote}
        </p>
      ) : null}

      {loading ? (
        <div className="h-28 animate-pulse rounded-[22px] border border-white/10 bg-white/[0.03]" />
      ) : null}

      {error ? (
        <p className="rounded-[22px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <ActiveSosCard key={alert.id} alert={alert} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
