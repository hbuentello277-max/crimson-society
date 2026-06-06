"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminPricingManager from "@/components/blackcard/AdminPricingManager";
import { AdminMembershipBadge } from "@/components/admin/AdminMembershipBadge";
import {
  sanitizePlan,
  type MembershipPlan,
  type MembershipPlanRow,
} from "@/components/blackcard/types";
import {
  hasActiveMembership,
  hasAdminBlackcardOverride,
  isFoundingBlackcardMember,
  resolveMembershipTier,
  subscriptionStatusLabel,
  type MembershipRow,
  type CrimsonMembershipTier,
} from "@/lib/membership";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  role: string | null;
  is_premium: boolean | null;
  premium_tier: string | null;
  premium_expires_at: string | null;
  is_founding_blackcard: boolean | null;
  founding_blackcard_granted_at: string | null;
  membership_tier: string | null;
  blackcard_public: boolean | null;
};

type BlackcardMemberCard = {
  userId: string;
  profile: ProfileRow;
  subscription: MembershipRow | null;
  displayTier: CrimsonMembershipTier;
};

function profileLabel(profile: ProfileRow) {
  return profile.username || profile.display_name || profile.email || "member";
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminBlackcardPage() {
  const [members, setMembers] = useState<BlackcardMemberCard[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadPlans = useCallback(async () => {
    const { data, error: planError } = await supabase
      .from("membership_plans")
      .select(
        "id, plan_type, title, description, price, stripe_price_id, active, perks, created_at, updated_at",
      )
      .order("price", { ascending: true });

    if (planError) throw planError;
    setPlans(((data ?? []) as MembershipPlanRow[]).map(sanitizePlan));
  }, []);

  const loadMembers = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be logged in.");
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminProfile || adminProfile.role !== "admin") {
      throw new Error("Admins only.");
    }

    const [profilesResponse, subscriptionsResponse] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, display_name, email, role, is_premium, premium_tier, premium_expires_at, is_founding_blackcard, founding_blackcard_granted_at, membership_tier, blackcard_public",
        )
        .or(
          "is_founding_blackcard.eq.true,is_premium.eq.true,membership_tier.in.(blackcard,founding)",
        ),
      supabase
        .from("subscriptions")
        .select("user_id, status, plan_type, current_period_end, created_at")
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false }),
    ]);

    if (profilesResponse.error) throw profilesResponse.error;
    if (subscriptionsResponse.error) throw subscriptionsResponse.error;

    const subscriptionByUser = new Map<string, MembershipRow>();
    for (const row of subscriptionsResponse.data ?? []) {
      const userId = String(row.user_id);
      if (!subscriptionByUser.has(userId)) {
        subscriptionByUser.set(userId, {
          status: row.status,
          plan_type: row.plan_type,
          current_period_end: row.current_period_end,
          created_at: row.created_at,
        });
      }
    }

    const profileById = new Map<string, ProfileRow>();
    for (const profile of (profilesResponse.data ?? []) as ProfileRow[]) {
      profileById.set(profile.id, profile);
    }

    const missingUserIds = [...subscriptionByUser.keys()].filter((id) => !profileById.has(id));
    if (missingUserIds.length > 0) {
      const { data: extraProfiles } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, email, role, is_premium, premium_tier, premium_expires_at, is_founding_blackcard, founding_blackcard_granted_at, membership_tier, blackcard_public",
        )
        .in("id", missingUserIds);

      for (const profile of (extraProfiles ?? []) as ProfileRow[]) {
        profileById.set(profile.id, profile);
      }
    }

    const cards: BlackcardMemberCard[] = [];

    for (const profile of profileById.values()) {
      const subscription = subscriptionByUser.get(profile.id) ?? null;
      const displayTier = resolveMembershipTier({
        membership: hasActiveMembership(subscription) ? subscription : null,
        profile,
        isAdmin: profile.role === "admin",
        blackcardPublic: profile.blackcard_public,
      });

      if (displayTier === "free") continue;

      cards.push({
        userId: profile.id,
        profile,
        subscription,
        displayTier,
      });
    }

    cards.sort((a, b) => {
      if (a.displayTier === "founding" && b.displayTier !== "founding") return -1;
      if (b.displayTier === "founding" && a.displayTier !== "founding") return 1;
      return profileLabel(a.profile).localeCompare(profileLabel(b.profile));
    });

    setMembers(cards);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([loadPlans(), loadMembers()]);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [loadMembers, loadPlans]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => {
      const label = profileLabel(member.profile).toLowerCase();
      return label.includes(q) || member.profile.email?.toLowerCase().includes(q);
    });
  }, [members, query]);

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500/70">Control Room</p>
            <h1 className="mt-3 text-4xl font-light tracking-tight">Blackcard Members</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-500">
              Founding members show a gold badge. Active Blackcard and admin override members show a
              red Blackcard badge.
            </p>
          </div>

          <Link
            href="/admin"
            className="text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
          >
            Back to admin
          </Link>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-[#090909] p-6">
            {!loading && !error && (
              <AdminPricingManager plans={plans} onRefresh={loadPlans} />
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#090909] p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl text-white">Member roster</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {filteredMembers.length} member{filteredMembers.length === 1 ? "" : "s"}
                </p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none sm:max-w-xs"
              />
            </div>

            {loading && <p className="text-sm text-zinc-400">Loading members…</p>}
            {!loading && error && <p className="text-sm text-red-400">{error}</p>}

            {!loading && !error && filteredMembers.length === 0 && (
              <p className="text-sm text-zinc-400">No active Blackcard members yet.</p>
            )}

            {!loading && !error && filteredMembers.length > 0 && (
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const { profile, subscription, displayTier } = member;
                  const hasOverride = hasAdminBlackcardOverride(profile);
                  const founding = isFoundingBlackcardMember(profile);
                  const renewal = formatDate(subscription?.current_period_end);
                  const overrideExpiry = formatDate(profile.premium_expires_at);

                  return (
                    <div
                      key={member.userId}
                      className="rounded-[20px] border border-white/8 bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-white">
                              @{profileLabel(profile).replace(/^@+/, "")}
                            </p>
                            <AdminMembershipBadge tier={displayTier} />
                            {profile.role === "admin" ? (
                              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                                Admin
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {profile.email || "No email on file"}
                          </p>
                          <p className="mt-2 text-xs text-zinc-600">
                            Subscription: {subscriptionStatusLabel(subscription)}
                            {renewal ? ` · Renews ${renewal}` : ""}
                          </p>
                          {hasOverride && !founding ? (
                            <p className="mt-1 text-xs text-[#e87a82]/90">
                              Admin override
                              {overrideExpiry ? ` until ${overrideExpiry}` : ""}
                            </p>
                          ) : null}
                          {founding && profile.founding_blackcard_granted_at ? (
                            <p className="mt-1 text-xs text-amber-200/80">
                              Founding granted {formatDate(profile.founding_blackcard_granted_at)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
