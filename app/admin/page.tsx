"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function fetchProfiles() {
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
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg("You need to be logged in.");
        setLoading(false);
        return;
      }

      const { data: me, error: meError } = await supabase
        .from("profiles")
        .select("id, role, status")
        .eq("id", user.id)
        .maybeSingle();

      if (meError) {
        setErrorMsg(meError.message);
        setLoading(false);
        return;
      }

      if (!me) {
        setErrorMsg("Your profile row was not found.");
        setLoading(false);
        return;
      }

      if (me.role !== "admin" || me.status !== "active") {
        setErrorMsg("You do not have access to this page.");
        setLoading(false);
        return;
      }

      await fetchProfiles();
      setLoading(false);
    }

    loadAdminPage();
  }, []);

  async function updateProfileField(
    id: string,
    field: "role" | "status",
    value: string
  ) {
    setSavingId(id);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      setSavingId(null);
      return;
    }

    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === id ? { ...profile, [field]: value } : profile
      )
    );

    setSuccessMsg("Profile access updated.");
    setSavingId(null);
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
          </div>

          <Link
            href="/profile"
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
          >
            Profile
          </Link>
        </div>

        {loading && <AdminSkeleton />}

        {!loading && errorMsg && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        {!loading && !errorMsg && (
          <>
            {successMsg && (
              <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                <p className="text-sm text-emerald-300">{successMsg}</p>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-white/10 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Profiles</h2>
                <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  {profiles.length} total
                </span>
              </div>

              <div className="mb-4 hidden gap-4 px-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500 md:grid md:grid-cols-[1fr_160px_180px]">
                <span>User ID</span>
                <span>Role</span>
                <span>Status</span>
              </div>

              <div className="space-y-3">
                {profiles.map((profile) => {
                  const currentRole = (profile.role || "user") as UserRole;
                  const currentStatus = (profile.status || "active") as UserStatus;
                  const isSaving = savingId === profile.id;

                  return (
                    <div
                      key={profile.id}
                      className="grid gap-4 rounded-xl border border-white/10 px-4 py-4 md:grid-cols-[1fr_160px_180px]"
                    >
                      <div>
                        <p className="text-sm text-white break-all">{profile.id}</p>
                      </div>

                      <select
                        value={currentRole}
                        disabled={isSaving}
                        onChange={(e) =>
                          updateProfileField(profile.id, "role", e.target.value)
                        }
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
                        onChange={(e) =>
                          updateProfileField(profile.id, "status", e.target.value)
                        }
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