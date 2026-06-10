"use client";

import { useEffect, useRef, useState } from "react";
import { assignMeetCoHost, removeMeetCoHost } from "@/lib/meets/co-host";
import { supabase } from "@/lib/supabase";

type ProfileResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
};

type MeetCoHostDialogProps = {
  meetId: string;
  hostUserId: string;
  currentCoHostId?: string | null;
  currentCoHostName?: string | null;
  onClose: () => void;
  onUpdated: (coHost: { id: string; name: string; username: string | null } | null) => void;
};

export function MeetCoHostDialog({
  meetId,
  hostUserId,
  currentCoHostId,
  currentCoHostName,
  onClose,
  onUpdated,
}: MeetCoHostDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const { data, error: searchError } = await supabase
        .from("public_profiles")
        .select("id, username, display_name, full_name")
        .or(
          `username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`,
        )
        .limit(6);

      if (!controller.signal.aborted) {
        if (searchError) {
          setResults([]);
        } else {
          setResults((data || []) as ProfileResult[]);
        }
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  async function handleAssign(profile: ProfileResult) {
    setBusy(true);
    setError(null);
    const result = await assignMeetCoHost(meetId, hostUserId, profile.id);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Could not assign co-host.");
      return;
    }

    const label =
      profile.display_name?.trim() ||
      profile.full_name?.trim() ||
      profile.username?.trim() ||
      "Crimson Member";
    onUpdated({ id: profile.id, name: label, username: profile.username });
    onClose();
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    const result = await removeMeetCoHost(meetId, hostUserId);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Could not remove co-host.");
      return;
    }

    onUpdated(null);
    onClose();
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#f4dadd]">Add Co-Host</p>
            <h3 className="mt-2 font-serif text-2xl text-white">Assign one co-host</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Co-hosts can start and end the meet, view riders, and earn host credits when the ride
              completes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400"
          >
            Close
          </button>
        </div>

        {currentCoHostId ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Current co-host</p>
            <p className="mt-1 text-sm text-zinc-100">{currentCoHostName || "Assigned rider"}</p>
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={busy}
              className="mt-3 rounded-lg border border-[#b4141e]/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f0c9ce] transition hover:bg-[#b4141e]/15 disabled:opacity-50"
            >
              Remove co-host
            </button>
          </div>
        ) : null}

        <div className="mt-4">
          <label className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Search members
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username"
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
          />
        </div>

        <div className="mt-3 max-h-48 overflow-y-auto">
          {loading ? <p className="text-sm text-zinc-500">Searching…</p> : null}
          {!loading &&
            results.map((profile) => {
              const label =
                profile.display_name?.trim() ||
                profile.full_name?.trim() ||
                profile.username?.trim() ||
                "Crimson Member";

              return (
                <button
                  key={profile.id}
                  type="button"
                  disabled={busy || profile.id === hostUserId}
                  onClick={() => void handleAssign(profile)}
                  className="flex w-full items-center justify-between border-b border-white/8 px-1 py-3 text-left transition last:border-b-0 hover:bg-white/[0.04] disabled:opacity-50"
                >
                  <span className="text-sm text-zinc-100">{label}</span>
                  {profile.username ? (
                    <span className="text-xs text-zinc-500">@{profile.username.replace(/^@+/, "")}</span>
                  ) : null}
                </button>
              );
            })}
        </div>

        {error ? <p className="mt-3 text-sm text-[#d85f6c]">{error}</p> : null}
      </div>
    </div>
  );
}
