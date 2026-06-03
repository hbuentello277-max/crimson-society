"use client";

import { useState } from "react";
import { authedFetch } from "@/lib/auth/authed-fetch";

type RecentRide = {
  id: string;
  host_id: string | null;
  name: string | null;
  date: string | null;
  time: string | null;
  meet_point: string | null;
  city: string | null;
  status: string | null;
  tracking_status: string | null;
};

type AdminProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
};

function formatRideSchedule(date?: string | null, time?: string | null) {
  if (!date) return "No schedule";
  return [date, time].filter(Boolean).join(" • ");
}

function getProfileLabel(id: string | null | undefined, profileMap: Map<string, AdminProfile>) {
  if (!id) return "Unknown";
  const profile = profileMap.get(id);
  const identity = profile?.username || profile?.display_name || profile?.email;
  return identity ? `@${identity.replace(/^@+/, "")}` : id.slice(0, 8);
}

export function AdminRecentMeetsSection({
  rides,
  profiles,
  onRideDeleted,
}: {
  rides: RecentRide[];
  profiles: Map<string, AdminProfile>;
  onRideDeleted: (rideId: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<RecentRide | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteMeetPermanently() {
    if (!deleteTarget || busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await authedFetch("/api/admin/rides", {
        method: "DELETE",
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete meet.");
      }

      onRideDeleted(deleteTarget.id);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete meet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <h3 className="mb-4 font-serif text-2xl text-white">Recent Meets</h3>
        {error ? (
          <p className="mb-3 rounded-xl border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-3 text-sm text-[#f0c9ce]">
            {error}
          </p>
        ) : null}
        {rides.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-500">
            No meets are available for review.
          </p>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => (
              <div key={ride.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{ride.name || "Untitled meet"}</p>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                    {ride.status || "active"} • {ride.tracking_status || "not_started"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Host {getProfileLabel(ride.host_id, profiles)} • {formatRideSchedule(ride.date, ride.time)}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                  {[ride.meet_point, ride.city].filter(Boolean).join(" • ") || "No meet point"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(ride)}
                    className="rounded-full border border-red-500/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-red-200 transition hover:border-red-500/70"
                  >
                    Delete permanently
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Permanent delete</p>
            <h2 className="mt-2 font-serif text-2xl text-white">Delete meet permanently?</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              This removes {deleteTarget.name || "this meet"} and all related attendees, messages,
              notifications, and live tracking data. This cannot be undone.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-3 text-xs uppercase tracking-[0.16em] text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteMeetPermanently()}
                className="rounded-xl border border-red-500/50 bg-red-500/15 px-4 py-3 text-xs uppercase tracking-[0.16em] text-red-200 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete Meet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
