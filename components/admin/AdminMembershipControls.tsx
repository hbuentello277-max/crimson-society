"use client";

import { useMemo, useState } from "react";
import { AdminMembershipBadge } from "@/components/admin/AdminMembershipBadge";
import {
  hasActiveMembership,
  hasAdminBlackcardOverride,
  membershipStatusLabel,
  resolveMembershipTier,
  subscriptionStatusLabel,
  type MembershipRow,
} from "@/lib/membership";

type AdminProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string | null;
  is_premium?: boolean | null;
  premium_tier?: string | null;
  premium_since?: string | null;
  premium_expires_at?: string | null;
  blackcard_public?: boolean | null;
  is_founding_blackcard?: boolean | null;
  founding_blackcard_granted_at?: string | null;
};

type SubscriptionRow = MembershipRow & { user_id?: string };

type Props = {
  profiles: AdminProfile[];
  subscriptionsByUserId: Record<string, SubscriptionRow | null>;
  savingId: string | null;
  onAction: (
    profileId: string,
    action: "grant" | "revoke" | "extend_30" | "extend_90" | "set_expiration" | "grant_founding" | "revoke_founding",
    expiresAt?: string,
  ) => Promise<void>;
};

function profileLabel(profile: AdminProfile) {
  return profile.username || profile.display_name || profile.id.slice(0, 8);
}

function formatDate(value?: string | null) {
  if (!value) return "No expiration";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiration";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminMembershipControls({
  profiles,
  subscriptionsByUserId,
  savingId,
  onAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "founding" | "blackcard">("all");
  const [customExpiryById, setCustomExpiryById] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (tierFilter === "founding" && !profile.is_founding_blackcard) return false;
      if (tierFilter === "blackcard" && profile.is_founding_blackcard) return false;
      if (tierFilter === "blackcard" && !profile.is_premium && !subscriptionsByUserId[profile.id]) return false;
      if (!q) return true;
      const label = profileLabel(profile).toLowerCase();
      return label.includes(q) || profile.id.toLowerCase().includes(q);
    });
  }, [profiles, query, tierFilter, subscriptionsByUserId]);

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">
            User Management
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Membership Controls</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Grant, revoke, or extend Blackcard access for beta testing, promotions, and manual
            corrections. Admin overrides stack on top of Stripe subscriptions.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by username"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
        />
        <select
          value={tierFilter}
          onChange={(event) => setTierFilter(event.target.value as "all" | "founding" | "blackcard")}
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
        >
          <option value="all" className="bg-black">All members</option>
          <option value="founding" className="bg-black">Founding only</option>
          <option value="blackcard" className="bg-black">Blackcard (non-founding)</option>
        </select>
      </div>

      <div className="mt-5 space-y-3">
        {filtered.slice(0, 24).map((profile) => {
          const subscription = subscriptionsByUserId[profile.id] ?? null;
          const isAdminAccount = profile.role === "admin";
          const hasOverride = hasAdminBlackcardOverride(profile);
          const busy = savingId === profile.id;

          return (
            <div
              key={profile.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-4 md:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-white">@{profileLabel(profile)}</p>
                    <AdminMembershipBadge
                      tier={resolveMembershipTier({
                        membership: hasActiveMembership(subscription) ? subscription : null,
                        profile,
                        isAdmin: isAdminAccount,
                      })}
                    />
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    Membership: {membershipStatusLabel({ membership: subscription, profile, isAdmin: isAdminAccount })}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Subscription: {subscriptionStatusLabel(subscription)}
                  </p>
                  {profile.founding_blackcard_granted_at ? (
                    <p className="mt-1 text-sm text-amber-200/80">
                      Founding granted: {formatDate(profile.founding_blackcard_granted_at)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-zinc-500">
                    Override expiration: {formatDate(profile.premium_expires_at)}
                  </p>
                  {subscription?.current_period_end ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      Stripe renewal: {formatDate(subscription.current_period_end)}
                    </p>
                  ) : null}
                </div>

                {!isAdminAccount ? (
                  <div className="flex flex-col gap-2 sm:min-w-[280px]">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busy || Boolean(profile.is_founding_blackcard)}
                        onClick={() => void onAction(profile.id, "grant_founding")}
                        className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        Grant Founding
                      </button>
                      <button
                        type="button"
                        disabled={busy || !profile.is_founding_blackcard}
                        onClick={() => void onAction(profile.id, "revoke_founding")}
                        className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-white/25 disabled:opacity-50"
                      >
                        Revoke Founding
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onAction(profile.id, "grant")}
                        className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/25 disabled:opacity-50"
                      >
                        Grant Blackcard
                      </button>
                      <button
                        type="button"
                        disabled={busy || !hasOverride}
                        onClick={() => void onAction(profile.id, "revoke")}
                        className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-white/25 disabled:opacity-50"
                      >
                        Revoke Override
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onAction(profile.id, "extend_30")}
                        className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-[#b4141e]/40 disabled:opacity-50"
                      >
                        Extend 30 Days
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onAction(profile.id, "extend_90")}
                        className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-[#b4141e]/40 disabled:opacity-50"
                      >
                        Extend 90 Days
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={customExpiryById[profile.id] || ""}
                        onChange={(event) =>
                          setCustomExpiryById((current) => ({
                            ...current,
                            [profile.id]: event.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        disabled={busy || !customExpiryById[profile.id]}
                        onClick={() =>
                          void onAction(
                            profile.id,
                            "set_expiration",
                            new Date(customExpiryById[profile.id]).toISOString(),
                          )
                        }
                        className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-[#b4141e]/40 disabled:opacity-50"
                      >
                        Set Expiration
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Admin account</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
