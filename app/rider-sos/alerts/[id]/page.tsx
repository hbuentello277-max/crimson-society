"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RiderSosResponseControls } from "@/components/rider-sos/RiderSosResponseControls";
import { useSosResponse } from "@/hooks/useSosResponse";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/crimson-accent";
import { getDistanceMiles } from "@/lib/gps/distance";
import { RIDER_SOS_NEARBY_RADIUS_MILES } from "@/lib/rider-sos/nearby-config";
import {
  formatSosDistanceMiles,
  formatSosStatusLabel,
  formatSosTimeAgo,
  riderSosDisplayName,
} from "@/lib/rider-sos/nearby-format";
import { requestCurrentPosition } from "@/lib/rider-sos/geolocation";
import { loadActiveSosAlertDetail } from "@/lib/rider-sos/load-nearby-alerts";
import type { NearbyRiderSosAlert } from "@/lib/rider-sos/nearby-types";
import { buildMapsUrl, sosTypeLabel } from "@/lib/rider-sos/sos-types";

const MeetMap = dynamic(() => import("@/components/MeetMap"), {
  ssr: false,
  loading: () => (
    <div className="h-56 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.03]" />
  ),
});

export default function RiderSosAlertDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id ?? "";
  const { session, loading: authLoading } = useAuth();
  const [alert, setAlert] = useState<NearbyRiderSosAlert | null>(null);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canRespond = Boolean(alert && session?.user && alert.user_id !== session.user.id);
  const sosResponse = useSosResponse(alert?.id ?? null, canRespond);

  useEffect(() => {
    if (authLoading) return;

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    if (!eventId) {
      setError("SOS alert not found.");
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const position = await requestCurrentPosition(8000);
        const viewer = position.ok ? { lat: position.latitude, lng: position.longitude } : null;
        const row = await loadActiveSosAlertDetail(eventId, viewer, RIDER_SOS_NEARBY_RADIUS_MILES);

        if (!active) return;

        if (!row) {
          setAlert(null);
          setError("This SOS alert is no longer active.");
          setLoading(false);
          return;
        }

        if (row.user_id === session?.user?.id) {
          router.replace("/rider-sos");
          return;
        }

        setAlert(row);

        if (viewer && row.latitude != null && row.longitude != null) {
          setDistanceMiles(
            row.distance_miles ??
              getDistanceMiles(viewer, {
                lat: Number(row.latitude),
                lng: Number(row.longitude),
              }),
          );
        } else {
          setDistanceMiles(row.distance_miles);
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load SOS alert.");
        setAlert(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [authLoading, eventId, router, session?.user]);

  const hasCoords = useMemo(
    () =>
      alert?.latitude != null &&
      alert?.longitude != null &&
      Number.isFinite(Number(alert.latitude)) &&
      Number.isFinite(Number(alert.longitude)),
    [alert],
  );

  if (authLoading || loading) {
    return (
      <main className={`min-h-screen bg-[#050505] px-4 pt-8 text-white ${BOTTOM_NAV_CLEARANCE}`}>
        <div className="mx-auto max-w-2xl">
          <div className="h-40 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.03]" />
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <main className={`relative min-h-screen bg-[#050505] px-4 pt-8 text-white sm:px-6 ${BOTTOM_NAV_CLEARANCE}`}>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]"
        >
          ‹ Back to Home
        </Link>

        {error ? (
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
            <p className="font-serif text-2xl text-white">SOS unavailable</p>
            <p className="mt-3 text-sm text-zinc-400">{error}</p>
          </div>
        ) : alert ? (
          <article className="mt-4 overflow-hidden rounded-[28px] border border-[#b4141e]/35 bg-gradient-to-b from-[#120608] via-[#0b0b0d] to-[#070707] p-5">
            <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">Rider SOS</p>
            <h1 className="mt-2 font-serif text-3xl text-white">{riderSosDisplayName(alert)}</h1>
            <p className="mt-2 text-sm text-zinc-300">{sosTypeLabel(alert.sos_type)}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#b4141e]/45 bg-[#b4141e]/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">
                {formatSosStatusLabel(alert.status)}
              </span>
              <span className="text-xs text-zinc-500">{formatSosTimeAgo(alert.created_at)}</span>
            </div>

            <dl className="mt-5 space-y-3 text-sm text-zinc-300">
              {alert.bike_info ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Bike</dt>
                  <dd className="mt-1">{alert.bike_info}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Distance</dt>
                <dd className="mt-1">{formatSosDistanceMiles(distanceMiles)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Activated</dt>
                <dd className="mt-1">{new Date(alert.created_at).toLocaleString()}</dd>
              </div>
            </dl>

            {hasCoords ? (
              <div className="mt-5 space-y-3">
                <div className="overflow-hidden rounded-[24px] border border-white/10">
                  <MeetMap
                    lat={Number(alert.latitude)}
                    lng={Number(alert.longitude)}
                    meetPoint="SOS location"
                    height={220}
                    compact
                    hideHint
                    interactive={false}
                    showMeetMarker
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  {Number(alert.latitude).toFixed(5)}, {Number(alert.longitude).toFixed(5)}
                </p>
                <a
                  href={buildMapsUrl(Number(alert.latitude), Number(alert.longitude))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#e87a82] transition hover:border-[#b4141e]/50"
                >
                  Open in Maps
                </a>
              </div>
            ) : (
              <p className="mt-5 text-sm text-zinc-500">Location was not shared for this SOS alert.</p>
            )}

            <RiderSosResponseControls
              loading={sosResponse.loading}
              submitting={sosResponse.submitting}
              error={sosResponse.error}
              status={sosResponse.response?.status ?? null}
              onRespond={() => void sosResponse.respond()}
              onMarkArrived={() => void sosResponse.markArrived()}
              onCancel={() => void sosResponse.cancelResponse()}
            />
          </article>
        ) : null}
      </div>
    </main>
  );
}
