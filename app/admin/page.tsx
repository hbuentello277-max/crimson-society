"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

type UserRole = "user" | "moderator" | "admin";
type UserStatus = "active" | "limited" | "suspended" | "blocked";
type MembershipTier = "regular" | "blackcard";

type AdminProfile = {
  id: string;
  username: string | null;
  email: string | null;
  display_name: string | null;
  role: string | null;
  status: string | null;
  is_premium?: boolean | null;
  premium_tier?: string | null;
  premium_since?: string | null;
  premium_expires_at?: string | null;
  created_at?: string | null;
};

function formatJoinedDate(value?: string | null) {
  if (!value) return "Joined recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Joined recently";

  const label = date
    .toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
    .replace(",", "");

  return "Joined" + label;
}

function getMembershipTier(item: AdminProfile): MembershipTier {
  if (item.is_premium && (item.premium_tier || "").toLowerCase() === "blackcard") {
    return "blackcard";
  }

  return "regular";
}

function AdminSkeleton() {
  return (
    <div className="mt-8 animate-pulse space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="h-3 w-20 rounded-full bg-white/10" />
        <div className="mt-3 h-5 w-64 rounded-full bg-white/10" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-8 w-32 rounded-full bg-white/10" />
          <div className="h-3 w-16 rounded-full bg-white/10" />
        </div>

        <div className="space-y-2.5">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="grid gap-3 rounded-xl border border-white/10 px-4 py-3.5 md:grid-cols-[1fr_150px_170px_170px]"
            >
              <div>
                <div className="h-4 w-40 rounded-full bg-white/10" />
                <div className="mt-2 h-3 w-56 rounded-full bg-white/10" />
                <div className="mt-2.5 h-3 w-28 rounded-full bg-white/10" />
              </div>
              <div className="h-9 w-full rounded-xl bg-white/10" />
              <div className="h-9 w-full rounded-xl bg-white/10" />
              <div className="h-9 w-full rounded-xl bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { session, loading: authLoading, profile, role, status, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const myUserId = session?.user?.id ?? null;

  const profileCountLabel = useMemo(() => String(profiles.length) + " total", [profiles.length]);

  async function fetchProfiles() {
    setErrorMsg("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, email, display_name, role, status, is_premium, premium_tier, premium_since, premium_expires_at, created_at",
      )
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

  async function updateProfileAccess(id: string, nextRole: UserRole, nextStatus: UserStatus) {
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
          : item,
      ),
    );

    setSuccessMsg("Profile access updated.");
    setSavingId(null);
  }

  function handleRoleChange(id: string, value: string) {
    const target = profiles.find((item) => item.id === id);
    if (!target) return;

    void updateProfileAccess(id, value as UserRole, (target.status || "active") as UserStatus);
  }

  function handleStatusChange(id: string, value: string) {
    const target = profiles.find((item) => item.id === id);
    if (!target) return;

    void updateProfileAccess(id, (target.role || "user") as UserRole, value as UserStatus);
  }

  async function handleMembershipChange(id: string, value: MembershipTier) {
    if (!myUserId) return;

    const target = profiles.find((item) => item.id === id);
    if (!target) return;

    const previousProfiles = profiles;
    const optimisticProfile: AdminProfile =
      value === "blackcard"
        ? {
            ...target,
            is_premium: true,
            premium_tier: "blackcard",
            premium_since: target.premium_since || new Date().toISOString(),
          }
        : {
            ...target,
            is_premium: false,
            premium_tier: null,
            premium_expires_at: null,
          };

    setProfiles((prev) => prev.map((item) => (item.id === id ? optimisticProfile : item)));
    setSavingId(id);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/profiles/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: id, membership: value }),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string; profile?: AdminProfile }
        | null;

      if (!response.ok) {
        throw new Error(result?.error || "Membership update failed.");
      }

      if (result?.profile) {
        setProfiles((prev) => prev.map((item) => (item.id === id ? { ...item, ...result.profile } : item)));
      }

      setSuccessMsg("Membership updated.");
    } catch (error) {
      setProfiles(previousProfiles);
      setErrorMsg(error instanceof Error ? error.message : "Membership update failed.");
    } finally {
      setSavingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-6 md:py-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Admin</p>
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
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-6 md:py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Admin</p>
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
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    eyebrow: "Blackcard",
                    title: "Membership controls",
                    href: "/admin/blackcard",
                    cta: "Members",
                  },
                  {
                    eyebrow: "Shop",
                    title: "Merch control room",
                    href: "/admin/shop",
                    cta: "Products",
                  },
                  {
                    eyebrow: "Crimson Sounds",
                    title: "Internal sound library",
                    href: "/admin/sounds",
                    cta: "Sounds",
                  },
                ].map((item) => (
                  <div key={item.href} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">{item.eyebrow}</p>
                    <h2 className="mt-2 font-serif text-2xl text-white">{item.title}</h2>
                    <Link
                      href={item.href}
                      className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[#b4141e]/40 bg-black/30 px-5 py-2 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
                    >
                      Manage {item.cta}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Profiles</h2>
                <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">{profileCountLabel}</span>
              </div>

              <div className="mb-3 hidden gap-4 px-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500 md:grid md:grid-cols-[1fr_150px_170px_170px]">
                <span>Member</span>
                <span>Role</span>
                <span>Status</span>
                <span>Membership</span>
              </div>

              <div className="space-y-2.5">
                {profiles.map((item) => {
                  const isOwner = item.id === myUserId;
                  const currentRole = (item.role || "user") as UserRole;
                  const currentStatus = (item.status || "active") as UserStatus;

                  const effectiveRole = isOwner ? "admin" : currentRole;
                  const effectiveStatus = isOwner ? "active" : currentStatus;

                  const isAdminAccount = effectiveRole === "admin";

                  const membership: MembershipTier = isAdminAccount ? "blackcard" : getMembershipTier(item);

                  const dropdownMembership: MembershipTier = isAdminAccount ? "blackcard" : getMembershipTier(item);

                  const isSaving = savingId === item.id;
                  const isSelf = isOwner;
                  const identity = item.username || item.display_name || "unknown-user";

                  const membershipControl = isAdminAccount ? (
                    <div className="flex min-h-10 items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm uppercase tracking-[0.18em] text-zinc-200">
                      BLACKCARD
                    </div>
                  ) : (
                    <select
                      value={dropdownMembership}
                      disabled={isSaving}
                      onChange={(e) => void handleMembershipChange(item.id, e.target.value as MembershipTier)}
                      className="min-h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-[#b4141e]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="regular" className="bg-black text-white">
                        regular
                      </option>
                      <option value="blackcard" className="bg-black text-white">
                        blackcard
                      </option>
                    </select>
                  );

                  return (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-[1.15rem] border border-white/10 bg-white/[0.02] px-4 py-3.5 md:grid-cols-[1fr_150px_170px_170px] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[15px] font-semibold text-white md:text-base">@{identity}</p>

                          <span
                            className={
                              membership === "blackcard"
                                ? "inline-flex items-center rounded-full border border-white/15 bg-gradient-to-b from-white/[0.16] to-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_18px_rgba(0,0,0,0.22)]"
                                : "inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-400"
                            }
                          >
                            {membership === "blackcard" ? "BLACKCARD" : "REGULAR"}
                          </span>

                          {isAdminAccount && (
                            <span className="inline-flex items-center rounded-full border border-[#b4141e]/25 bg-[#b4141e]/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-[#dba7ad]">
                              Admin
                            </span>
                          )}

                          {isSelf && (
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-400">
                              You
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 break-all text-sm text-zinc-500">{item.email || "No email on file"}</p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-zinc-600">
                          {formatJoinedDate(item.created_at)}
                        </p>
                      </div>

                      <select
                        value={effectiveRole}
                        disabled={isSaving}
                        onChange={(e) => handleRoleChange(item.id, e.target.value)}
                        className="min-h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-[#b4141e]/60 disabled:cursor-not-allowed disabled:opacity-60"
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
                        value={effectiveStatus}
                        disabled={isSaving}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className="min-h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-[#b4141e]/60 disabled:cursor-not-allowed disabled:opacity-60"
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

                      {membershipControl}
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