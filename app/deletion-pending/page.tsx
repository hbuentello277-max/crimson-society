"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authedFetch } from "@/lib/auth/authed-fetch";
import {
  type AccountDeletionRequestRow,
  deletionStatusLabel,
  isOpenDeletionStatus,
} from "@/lib/account-deletion/types";
import { supabase } from "@/lib/supabase";

export default function DeletionPendingPage() {
  const router = useRouter();
  const { session, loading: authLoading, status, signOut, refreshProfile } = useAuth();
  const [request, setRequest] = useState<AccountDeletionRequestRow | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadRequest = useCallback(async () => {
    if (!session?.user?.id) {
      setRequest(null);
      setLoadingRequest(false);
      return;
    }

    setLoadingRequest(true);
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .select(
        "id, user_id, status, details, requested_at, reviewed_at, reviewed_by, signed_out_at, previous_status",
      )
      .eq("user_id", session.user.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      setRequest((data as AccountDeletionRequestRow | null) ?? null);
    }
    setLoadingRequest(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!authLoading) void loadRequest();
  }, [authLoading, loadRequest]);

  const cancelDeletion = async () => {
    if (busy || !request || request.status !== "pending") return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await authedFetch("/api/account/deletion-cancel", { method: "POST" });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error || "Could not cancel deletion request.");
      }

      await refreshProfile();
      setMessage(result?.message || "Deletion request canceled. Your account is active again.");
      router.replace("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel request.");
    } finally {
      setBusy(false);
    }
  };

  const keepDeletionRequest = async () => {
    await signOut();
    router.replace("/login");
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#050505] px-5 pt-[calc(env(safe-area-inset-top)+2rem)] text-zinc-400">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-[#050505] px-5 pt-[calc(env(safe-area-inset-top)+2rem)] text-white">
        <div className="mx-auto max-w-lg">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Account deletion</p>
          <h1 className="mt-3 font-serif text-3xl">Sign in to manage deletion</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            If you requested account deletion, sign in here to view status or cancel while your
            request is still pending.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-3 text-xs uppercase tracking-[0.18em] text-[#f1c3c7]"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  if (status !== "deletion_pending") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 pt-[calc(env(safe-area-inset-top)+2rem)] text-white">
        <div className="mx-auto max-w-lg">
          <h1 className="font-serif text-3xl">No pending deletion</h1>
          <p className="mt-4 text-sm text-zinc-400">This account is not waiting for deletion approval.</p>
          <Link href="/profile" className="mt-6 inline-block text-sm text-[#e87a82]">
            Back to profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 pb-28 pt-[calc(env(safe-area-inset-top)+2rem)] text-white">
      <div className="mx-auto max-w-lg">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Account deletion</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">Deletion pending</h1>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-base leading-7 text-zinc-200">
            Your account deletion request is pending.
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Would you like to cancel your request and keep your account?
          </p>

          {loadingRequest ? (
            <p className="mt-4 text-sm text-zinc-500">Loading request status…</p>
          ) : request ? (
            <p className="mt-4 text-sm text-[#e87a82]">{deletionStatusLabel(request.status)}</p>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No deletion request record found.</p>
          )}
        </section>

        {message ? <p className="mt-4 text-sm text-zinc-400">{message}</p> : null}

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void keepDeletionRequest()}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-white/25 disabled:opacity-60"
          >
            Keep Deletion Request
          </button>

          {request?.status === "pending" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelDeletion()}
              className="rounded-xl border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-3 text-sm font-medium text-[#f1c3c7] transition hover:bg-[#b4141e]/25 disabled:opacity-60"
            >
              {busy ? "Canceling…" : "Cancel Request"}
            </button>
          )}
        </div>

        <Link
          href="/account-deletion"
          className="mt-6 inline-block text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-[#e87a82]"
        >
          Account deletion information
        </Link>

        {request && isOpenDeletionStatus(request.status) ? (
          <p className="mt-6 text-xs leading-5 text-zinc-600">
            After admin approval, your Blackcard subscription will be canceled, personal data
            removed, and your sign-in account deleted. Moderation records may be retained as
            described in our Privacy Policy.
          </p>
        ) : null}
      </div>
    </main>
  );
}
