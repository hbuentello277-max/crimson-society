"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

type UserRole = "user" | "moderator" | "admin";
type UserStatus = "active" | "limited" | "suspended" | "blocked";

type AdminProfile = {
  id: string;
  role: string | null;
  status: string | null;
};

function AdminSkeleton() {
  return (
    <div className="mt-8 animate-pulse space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="h-3 w-20 rounded-full bg-white/10" />
        <div className="mt-3 h-5 w-64 rounded-full bg-white/10" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-8 w-32 rounded-full bg-white/10" />
          <div className="h-3 w-16 rounded-full bg-white/10" />
        </div>

        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="grid gap-4 rounded-xl border border-white/10 px-4 py-4 md:grid-cols-[1fr_160px_180px]"
            >
              <div>
                <div className="h-4 w-40 rounded-full bg-white/10" />
                <div className="mt-2 h-3 w-56 rounded-full bg-white/10" />
              </div>
              <div className="h-10 w-full rounded-xl bg-white/10" />
              <div className="h-10 w-full rounded-xl bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const {
    session,
    loading: authLoading,
    profile,
    role,
    status,
    isAdmin,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const myUserId = session?.user?.id ?? null;

  const profileCountLabel = useMemo(() => `${profiles.length} total`, [profiles.length]);

  async function fetchProfiles() {
    setErrorMsg("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, status")
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setProfiles((data as AdminProfile[]) || []);
  }

  useEffect(() => {
    async function loadAdminPage() {
      if (authLoading) return;

      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      if (!session?.user) {
        setErrorMsg("You need to be logged in.");
        setLoading(false);
        return;
      }

      if (!profile) {
        setErrorMsg("Your profile row was not found.");
        setLoading(false);
        return;
      }

      if (!isAdmin) {
        setErrorMsg("You do not have access to this page.");
        setLoading(false);
        return;
      }

      await fetchProfiles();
      setLoading(false);
    }

    void loadAdminPage();
  }, [authLoading, session, profile, isAdmin]);

  async function updateProfileAccess(
    id: string,
    nextRole: UserRole,
    nextStatus: UserStatus
  ) {
    if (!myUserId) return;

    const current = profiles.find((item) => item.id === id);
    if (!current) return;

    const currentRole = (current.role || "user") as UserRole;
    const currentStatus = (current.status || "active") as UserStatus;

    if (currentRole === nextRole && currentStatus === nextStatus) {
      return;
    }

    if (id === myUserId && nextStatus !== "active") {
      setErrorMsg("You cannot suspend, block, or limit your own admin account.");
      return;
    }

    setSavingId(id);
    setErrorMsg("");
    setSuccessMsg("");

    const { data, error } = await supabase.rpc("admin_update_profile_access", {
      target_user_id: id,
      new_role: nextRole,
      new_status: nextStatus,
    });

    if (error) {
      setErrorMsg(error.message);
      setSavingId(null);
      return;
    }

    const updated = data as AdminProfile | null;

    setProfiles((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              role: updated?.role ?? nextRole,
              status: updated?.status ?? nextStatus,
            }
          : item
      )
    );

    setSuccessMsg("Profile access updated.");
    setSavingId(null);
  }

  function handleRoleChange(id: string, value: string) {
    const target = profiles.find((item) => item.id === id);
    if (!target) return;

    void updateProfileAccess(
      id,
      value as UserRole,
      (target.status || "active") as UserStatus
    );
  }

  function handleStatusChange(id: string, value: string) {
    const target = profiles.find((item) => item.id === id);
    if (!target) return;

    void updateProfileAccess(
      id,
      (target.role || "user") as UserRole,
      value as UserStatus
    );
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                Admin
              </p>
              <h1 className="mt-3 text-4xl font-semibold">Control Room</h1>
            </div>

            <Link
              href="/profile"
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
            >
              Profile
            </Link>
          </div>

          <AdminSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Admin
            </p>
            <h1 className="mt-3 text-4xl font-semibold">Control Room</h1>
            {role && status && (
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
                {role} · {status}
              </p>
            )}
          </div>

          <Link
            href="/profile"
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
          >
            Profile
          </Link>
        </div>

        {errorMsg && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        {!errorMsg && (
          <>
            {successMsg && (
              <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                <p className="text-sm text-emerald-300">{successMsg}</p>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-[#b4141e]/25 bg-[#b4141e]/10 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">
                    Crimson Sounds
                  </p>
                  <h2 className="mt-2 font-serif text-2xl text-white">
                    Internal sound library
                  </h2>
                </div>
                <Link
                  href="/admin/sounds"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#b4141e]/40 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
                >
                  Manage Sounds
                </Link>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Profiles</h2>
                <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  {profileCountLabel}
                </span>
              </div>

              <div className="mb-4 hidden gap-4 px-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500 md:grid md:grid-cols-[1fr_160px_180px]">
                <span>User ID</span>
                <span>Role</span>
                <span>Status</span>
              </div>

              <div className="space-y-3">
                {profiles.map((item) => {
                  const currentRole = (item.role || "user") as UserRole;
                  const currentStatus = (item.status || "active") as UserStatus;
                  const isSaving = savingId === item.id;
                  const isSelf = item.id === myUserId;

                  return (
                    <div
                      key={item.id}
                      className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 md:grid-cols-[1fr_160px_180px]"
                    >
                      <div>
                        <p className="break-all text-sm text-white">{item.id}</p>
                        {isSelf && (
                          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-[#e87a82]">
                            You
                          </p>
                        )}
                      </div>

                      <select
                        value={currentRole}
                        disabled={isSaving}
                        onChange={(e) => handleRoleChange(item.id, e.target.value)}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-[#b4141e]/60 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="user" className="bg-black text-white">
                          user
                        </option>
                        <option value="moderator" className="bg-black text-white">
                          moderator
                        </option>
                        <option value="admin" className="bg-black text-white">
                          admin
                        </option>
                      </select>

                      <select
                        value={currentStatus}
                        disabled={isSaving}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-[#b4141e]/60 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="active" className="bg-black text-white">
                          active
                        </option>
                        <option value="limited" className="bg-black text-white">
                          limited
                        </option>
                        <option value="suspended" className="bg-black text-white">
                          suspended
                        </option>
                        <option value="blocked" className="bg-black text-white">
                          blocked
                        </option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
