"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/crimson-accent";
import {
  type RiderSosEventRow,
  buildMapsUrl,
  sosTypeLabel,
} from "@/lib/rider-sos/sos-types";
import { supabase } from "@/lib/supabase";

type ProfileSummary = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
};

function riderDisplayName(profile: ProfileSummary) {
  return profile.display_name?.trim() || profile.full_name?.trim() || "Unknown rider";
}

export default function AdminSosPage() {
  const [events, setEvents] = useState<RiderSosEventRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: eventRows, error: eventsError } = await supabase
        .from("rider_sos_events")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (eventsError) {
        setError(eventsError.message);
        setLoading(false);
        return;
      }

      const activeEvents = (eventRows ?? []) as RiderSosEventRow[];
      setEvents(activeEvents);

      const userIds = [...new Set(activeEvents.map((event) => event.user_id))];
      if (userIds.length === 0) {
        setProfilesById({});
        setLoading(false);
        return;
      }

      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, full_name")
        .in("id", userIds);

      if (profilesError) {
        setError(profilesError.message);
        setLoading(false);
        return;
      }

      const nextProfiles: Record<string, ProfileSummary> = {};
      for (const row of profileRows ?? []) {
        nextProfiles[row.id] = row as ProfileSummary;
      }

      setProfilesById(nextProfiles);
      setLoading(false);
    }

    void load();
  }, []);

  const empty = !loading && events.length === 0;

  const cards = useMemo(
    () =>
      events.map((event) => {
        const profile = profilesById[event.user_id];
        const riderName = profile ? riderDisplayName(profile) : "Unknown rider";
        const hasCoords =
          event.latitude != null &&
          event.longitude != null &&
          Number.isFinite(Number(event.latitude)) &&
          Number.isFinite(Number(event.longitude));

        return (
          <article
            key={event.id}
            className="rounded-[24px] border border-[#b4141e]/35 bg-[#b4141e]/8 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#e87a82]">Active SOS</p>
                <h2 className="mt-1 font-serif text-2xl text-white">{riderName}</h2>
                <p className="mt-1 text-sm text-zinc-300">{sosTypeLabel(event.sos_type)}</p>
              </div>
              <span className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">
                {event.status}
              </span>
            </div>

            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-zinc-500">
              {new Date(event.created_at).toLocaleString()}
            </p>

            <dl className="mt-4 space-y-2 text-sm text-zinc-300">
              {event.bike_info ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Bike</dt>
                  <dd>{event.bike_info}</dd>
                </div>
              ) : null}
              {event.emergency_contact_name || event.emergency_contact_phone ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Emergency Contact</dt>
                  <dd>
                    {[event.emergency_contact_name, event.emergency_contact_phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              ) : null}
              {event.medical_notes ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Medical Notes</dt>
                  <dd className="whitespace-pre-wrap text-zinc-400">{event.medical_notes}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Location</dt>
                <dd>
                  {hasCoords ? (
                    <span>
                      {Number(event.latitude).toFixed(5)}, {Number(event.longitude).toFixed(5)}
                      {event.location_accuracy != null
                        ? ` (±${Math.round(Number(event.location_accuracy))}m)`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-zinc-500">No GPS attached</span>
                  )}
                </dd>
              </div>
            </dl>

            {hasCoords ? (
              <a
                href={buildMapsUrl(Number(event.latitude), Number(event.longitude))}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#e87a82] transition hover:border-[#b4141e]/50"
              >
                Open in Maps
              </a>
            ) : null}
          </article>
        );
      }),
    [events, profilesById],
  );

  return (
    <main className={`relative min-h-screen bg-[#050505] px-4 pt-8 text-white sm:px-6 ${BOTTOM_NAV_CLEARANCE}`}>
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]"
        >
          ‹ Back to Admin
        </Link>

        <header className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">Admin</p>
          <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Active SOS Alerts</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Live rider SOS events. Riders resolve or cancel alerts from their SOS page.
          </p>
        </header>

        {loading ? (
          <div className="mt-8 space-y-4">
            <div className="h-28 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.03]" />
          </div>
        ) : null}

        {error ? (
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-red-400">{error}</p>
        ) : null}

        {empty ? (
          <p className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-zinc-500">
            No active SOS alerts right now.
          </p>
        ) : (
          <div className="mt-8 space-y-4">{cards}</div>
        )}
      </div>
    </main>
  );
}
