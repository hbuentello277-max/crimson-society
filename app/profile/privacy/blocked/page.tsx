"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type BlockedProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
};

function displayName(profile: BlockedProfile) {
  return profile.display_name?.trim() || profile.full_name?.trim() || "Crimson Member";
}

function handleFor(profile: BlockedProfile) {
  const username = profile.username?.trim();
  return username ? `@${username}` : "@crimson-member";
}

export default function BlockedMembersPage() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BlockedProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unblockBusyId, setUnblockBusyId] = useState<string | null>(null);

  const loadBlockedMembers = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: blocks, error: blocksError } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });

    if (blocksError) {
      setError(blocksError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const blockedIds = (blocks ?? []).map((row) => row.blocked_id).filter(Boolean);

    if (blockedIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, full_name, profile_image_url, avatar_url")
      .in("id", blockedIds);

    if (profilesError) {
      setError(profilesError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const profileById = new Map(
      ((profiles ?? []) as BlockedProfile[]).map((profile) => [profile.id, profile]),
    );
    const ordered = blockedIds
      .map((id) => profileById.get(id))
      .filter((profile): profile is BlockedProfile => Boolean(profile));

    setRows(ordered);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    void loadBlockedMembers();
  }, [authLoading, loadBlockedMembers]);

  async function unblockMember(targetId: string) {
    if (!userId || unblockBusyId) return;

    setUnblockBusyId(targetId);
    setMessage(null);

    const { error: unblockError } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", userId)
      .eq("blocked_id", targetId);

    if (unblockError) {
      setMessage(unblockError.message || "Could not unblock this rider.");
      setUnblockBusyId(null);
      return;
    }

    setRows((prev) => prev.filter((row) => row.id !== targetId));
    setMessage("Rider unblocked.");
    setUnblockBusyId(null);
    window.setTimeout(() => setMessage(null), 2600);
  }

  if (authLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        <div className="relative mx-auto max-w-3xl px-5 pb-28 pt-10 sm:px-6">
          <div className="h-64 animate-pulse rounded-[32px] border border-white/10 bg-white/[0.03]" />
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <div>
          <h1 className="font-serif text-4xl">Sign in required</h1>
          <p className="mt-4 text-sm text-zinc-400">You need to be logged in to manage blocked members.</p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.25),transparent_65%)]" />
      <div className="relative mx-auto max-w-3xl px-5 pb-28 pt-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.38em] text-zinc-500">Privacy</p>
            <h1 className="mt-3 font-serif text-4xl text-white">Blocked Members</h1>
          </div>
          <Link
            href="/profile/edit"
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
          >
            Back to Settings
          </Link>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500">
          Riders you block cannot message you where supported and are limited from direct interaction.
        </p>

        {error && (
          <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-zinc-400">{message}</p>
        )}

        {loading ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded-full bg-white/10" />
                    <div className="h-3 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center">
            <p className="font-serif text-xl italic text-zinc-300">You have not blocked anyone yet.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {rows.map((person) => {
              const avatarUrl = person.profile_image_url || person.avatar_url;
              const username = person.username?.trim();

              return (
                <li
                  key={person.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/40 bg-black">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={`${displayName(person)} avatar`}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized={avatarUrl.includes("supabase")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.24),transparent_58%)] font-serif text-lg text-[#f0c8cb]">
                          {displayName(person).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{displayName(person)}</p>
                      <p className="truncate text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                        {handleFor(person)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                      {username && (
                        <Link
                          href={`/profile/${encodeURIComponent(username)}`}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                        >
                          View Profile
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void unblockMember(person.id)}
                        disabled={unblockBusyId === person.id}
                        className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/12 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-[#e87a82] transition hover:border-[#b4141e]/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {unblockBusyId === person.id ? "Saving" : "Unblock"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
