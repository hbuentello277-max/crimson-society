"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/auth/authed-fetch";
import { supabase } from "@/lib/supabase";

type AdminProfile = {
  id: string;
  username: string | null;
  email: string | null;
  display_name: string | null;
};

type AccountDeletionRequest = {
  id: string;
  user_id: string | null;
  status: string | null;
  details: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type DeletionActionStatus = "reviewing" | "completed" | "rejected";
type DeletionFilter = "all" | "pending" | "canceled" | "completed" | "rejected";

function isDeletionClosed(status: string | null | undefined) {
  return status === "completed" || status === "canceled" || status === "rejected";
}

function formatAdminDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getProfileLabel(id: string | null | undefined, profileMap: Map<string, AdminProfile>) {
  if (!id) return "Unknown";
  const profile = profileMap.get(id);
  const identity = profile?.username || profile?.display_name || profile?.email;
  return identity ? `@${identity.replace(/^@+/, "")}` : id.slice(0, 8);
}

export function AdminDeletionQueueSection({ enabled }: { enabled: boolean }) {
  const [requests, setRequests] = useState<AccountDeletionRequest[]>([]);
  const [profiles, setProfiles] = useState<Map<string, AdminProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<DeletionFilter>("all");

  const loadRequests = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError("");

    const response = await authedFetch("/api/admin/deletion-requests");
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || "Failed to load deletion requests.");
      setRequests([]);
      setProfiles(new Map());
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as {
      requests?: AccountDeletionRequest[];
      profiles?: AdminProfile[];
    };

    setRequests(payload.requests || []);
    setProfiles(new Map((payload.profiles || []).map((profile) => [profile.id, profile])));
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("admin-deletion-requests-panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_deletion_requests" },
        () => {
          void loadRequests();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, loadRequests]);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    if (filter === "pending") {
      return requests.filter((request) =>
        ["pending", "reviewing"].includes(request.status || "pending"),
      );
    }
    return requests.filter((request) => request.status === filter);
  }, [filter, requests]);

  async function updateStatus(requestId: string, status: DeletionActionStatus) {
    setSavingId(requestId);
    setError("");

    try {
      const response = await authedFetch("/api/admin/deletion-requests", {
        method: "PATCH",
        body: JSON.stringify({ id: requestId, status }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        request?: AccountDeletionRequest;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update deletion request.");
      }

      if (result?.request) {
        setRequests((current) =>
          current.map((item) => (item.id === requestId ? { ...item, ...result.request } : item)),
        );
      } else {
        await loadRequests();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update request.");
    } finally {
      setSavingId(null);
    }
  }

  if (!enabled) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-4">
        <h3 className="font-serif text-2xl text-white">Account Deletion Requests</h3>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Approve deletion cancels active Stripe subscriptions, deletes user content and media,
          removes the auth account, and writes a compliance audit entry.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ["all", "All"],
          ["pending", "Pending"],
          ["canceled", "Cancelled"],
          ["completed", "Approved"],
          ["rejected", "Rejected"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] transition ${
              filter === value
                ? "border-[#b4141e]/60 bg-[#b4141e]/20 text-[#f1c3c7]"
                : "border-white/10 bg-white/[0.03] text-zinc-500 hover:border-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-3 rounded-xl border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-3 text-sm text-[#f0c9ce]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-500">
          Loading deletion requests…
        </p>
      ) : filteredRequests.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-500">
          No account deletion requests match this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <div key={request.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {getProfileLabel(request.user_id, profiles)}
                </p>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                  {request.status || "pending"}
                </span>
              </div>
              {request.details ? (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{request.details}</p>
              ) : null}
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                Requested {formatAdminDate(request.requested_at)}
              </p>
              {!isDeletionClosed(request.status) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingId === request.id}
                    onClick={() => void updateStatus(request.id, "reviewing")}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7] disabled:opacity-50"
                  >
                    {savingId === request.id ? "Saving" : "Mark reviewed"}
                  </button>
                  <button
                    type="button"
                    disabled={savingId === request.id}
                    onClick={() => void updateStatus(request.id, "completed")}
                    title="Permanently deletes the account, cancels Stripe subscriptions, and purges user content"
                    className="rounded-full border border-emerald-500/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-emerald-200/90 transition hover:border-emerald-500/60 disabled:opacity-50"
                  >
                    Approve deletion
                  </button>
                  <button
                    type="button"
                    disabled={savingId === request.id}
                    onClick={() => void updateStatus(request.id, "rejected")}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-zinc-500 transition hover:border-white/25 hover:text-zinc-300 disabled:opacity-50"
                  >
                    {savingId === request.id ? "Saving" : "Reject"}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
