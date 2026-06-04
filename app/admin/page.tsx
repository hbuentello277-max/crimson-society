"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import {
  getUserReportTargetType,
  userReportTargetLabel,
  type UserReportTargetType,
} from "@/lib/user-reports";
import { AdminDeletionQueueSection } from "@/components/admin/AdminDeletionQueueSection";
import { AdminRecentMeetsSection } from "@/components/admin/AdminRecentMeetsSection";
import { AdminMembershipControls } from "@/components/admin/AdminMembershipControls";
import type { MembershipRow } from "@/lib/membership";

type UserRole = "user" | "moderator" | "admin";
type UserStatus = "active" | "limited" | "suspended" | "blocked";
type MembershipTier = "regular" | "blackcard" | "founding";

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
  is_founding_blackcard?: boolean | null;
  founding_blackcard_granted_at?: string | null;
  membership_tier?: string | null;
  blackcard_public?: boolean | null;
  created_at?: string | null;
};

type AdminReport = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  ride_id: string | null;
  post_id: string | null;
  message_id: string | null;
  conversation_id: string | null;
  reason: string | null;
  details: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function getAdminReportTargetType(report: AdminReport): UserReportTargetType {
  return getUserReportTargetType(report);
}

function formatAdminReportTargetRef(
  report: AdminReport,
  messageTypeById?: Map<string, string>,
) {
  const type = getAdminReportTargetType(report);
  if (type === "post" && report.post_id) {
    return `Post ${report.post_id.slice(0, 8)}`;
  }
  if (type === "message") {
    if (report.message_id) {
      const messageType = messageTypeById?.get(report.message_id);
      const label = messageType && messageType !== "text" ? ` (${messageType})` : "";
      return `Message ${report.message_id.slice(0, 8)}${label}`;
    }
    if (report.conversation_id) {
      return `Conversation ${report.conversation_id.slice(0, 8)}`;
    }
  }
  if (type === "meet" && report.ride_id) {
    return `Meet ${report.ride_id.slice(0, 8)}`;
  }
  return null;
}

type AccountDeletionRequest = {
  id: string;
  user_id: string;
  status: string | null;
  details: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type RecentPost = {
  id: string;
  user_id: string | null;
  caption: string | null;
  post_type: string | null;
  media_status: string | null;
  location: string | null;
  created_at: string | null;
};

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

function formatRideSchedule(date?: string | null, time?: string | null) {
  if (!date && !time) return "No schedule";

  const value = `${date || ""}T${time || "00:00"}`;
  const parsed = new Date(value);

  if (date && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return [date, time].filter(Boolean).join(" • ");
}

function getProfileLabel(id: string | null | undefined, profileMap: Map<string, AdminProfile>) {
  if (!id) return "Unknown";

  const profile = profileMap.get(id);
  const identity = profile?.username || profile?.display_name || profile?.email;

  return identity ? `@${identity.replace(/^@+/, "")}` : id.slice(0, 8);
}

function getMembershipTier(item: AdminProfile): MembershipTier {
  if (item.is_founding_blackcard) return "founding";
  if (item.is_premium && (item.premium_tier || "").toLowerCase() === "blackcard") {
    return "blackcard";
  }
  if ((item.membership_tier || "").toLowerCase() === "founding") return "founding";
  if ((item.membership_tier || "").toLowerCase() === "blackcard") return "blackcard";
  return "regular";
}

type ReportActionStatus = "reviewing" | "resolved" | "dismissed";
type DeletionActionStatus = "reviewing" | "completed" | "canceled";

function isReportClosed(status: string | null | undefined) {
  return status === "resolved" || status === "dismissed";
}

function isDeletionClosed(status: string | null | undefined) {
  return status === "completed" || status === "canceled";
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

function AdminPageContent() {
  const searchParams = useSearchParams();
  const { session, loading: authLoading, profile, role, status, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [moderationProfiles, setModerationProfiles] = useState<Map<string, AdminProfile>>(new Map());
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportedMessageTypes, setReportedMessageTypes] = useState<Map<string, string>>(new Map());
  const [deletionRequests, setDeletionRequests] = useState<AccountDeletionRequest[]>([]);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [moderationLoading, setModerationLoading] = useState(true);
  const [socialStats, setSocialStats] = useState({
    favorites: 0,
    blackcardMeets: 0,
    meetSubscriptions: 0,
  });
  useEffect(() => {
    if (searchParams.get("section") !== "deletion") return;
    window.requestAnimationFrame(() => {
      document
        .getElementById("admin-deletion-requests")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [searchParams]);


  const [moderationError, setModerationError] = useState("");
  const [moderationSavingId, setModerationSavingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [subscriptionsByUserId, setSubscriptionsByUserId] = useState<Record<string, MembershipRow | null>>({});

  const myUserId = session?.user?.id ?? null;

  const profileCountLabel = useMemo(() => String(profiles.length) + " total", [profiles.length]);
  const pendingReportCount = useMemo(
    () => reports.filter((report) => (report.status || "pending") === "pending").length,
    [reports],
  );
  const pendingDeletionCount = useMemo(
    () =>
      deletionRequests.filter((request) =>
        ["pending", "reviewing"].includes(request.status || "pending"),
      ).length,
    [deletionRequests],
  );

  async function fetchProfiles() {
    setErrorMsg("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, email, display_name, role, status, is_premium, premium_tier, premium_since, premium_expires_at, is_founding_blackcard, founding_blackcard_granted_at, created_at",
      )
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    const nextProfiles = (data as AdminProfile[]) || [];
    setProfiles(nextProfiles);

    if (nextProfiles.length > 0) {
      const { data: subscriptionRows } = await supabase
        .from("subscriptions")
        .select("user_id, status, plan_type, current_period_end, created_at")
        .in(
          "user_id",
          nextProfiles.map((item) => item.id),
        )
        .order("current_period_end", { ascending: false, nullsFirst: true });

      const map: Record<string, MembershipRow | null> = {};
      for (const row of subscriptionRows || []) {
        const userId = String((row as { user_id?: string }).user_id || "");
        if (!userId || map[userId]) continue;
        map[userId] = row as MembershipRow;
      }
      setSubscriptionsByUserId(map);
    }
  }

  async function fetchModerationData() {
    setModerationLoading(true);
    setModerationError("");

    const [reportsResponse, deletionResponse, postsResponse, ridesResponse, favoritesResponse, subscriptionsResponse, blackcardMeetsResponse] = await Promise.all([
      supabase
        .from("user_reports")
        .select(
          "id, reporter_id, reported_user_id, ride_id, post_id, message_id, conversation_id, reason, details, status, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("account_deletion_requests")
        .select("id, user_id, status, details, requested_at, reviewed_at, reviewed_by")
        .order("requested_at", { ascending: false })
        .limit(8),
      supabase
        .from("Posts")
        .select("id, user_id, caption, post_type, media_status, location, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("rides")
        .select("id, host_id, name, date, time, meet_point, city, status, tracking_status")
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(6),
      supabase.from("favorite_riders").select("id", { count: "exact", head: true }),
      supabase.from("ride_notification_subscriptions").select("id", { count: "exact", head: true }),
      supabase.from("rides").select("id", { count: "exact", head: true }).eq("visibility", "blackcard"),
    ]);

    setSocialStats({
      favorites: favoritesResponse.count ?? 0,
      meetSubscriptions: subscriptionsResponse.count ?? 0,
      blackcardMeets: blackcardMeetsResponse.count ?? 0,
    });

    const firstError =
      reportsResponse.error ||
      deletionResponse.error ||
      postsResponse.error ||
      ridesResponse.error;

    if (firstError) {
      setModerationError(firstError.message);
      setReports([]);
      setDeletionRequests([]);
      setRecentPosts([]);
      setRecentRides([]);
      setModerationProfiles(new Map());
      setModerationLoading(false);
      return;
    }

    const nextReports = ((reportsResponse.data || []) as AdminReport[]) || [];
    const messageIds = nextReports
      .map((report) => report.message_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const { data: reportedMessages } = messageIds.length
      ? await supabase.from("messages").select("id, message_type").in("id", messageIds)
      : { data: [] as { id: string; message_type: string | null }[] };

    const nextDeletionRequests =
      ((deletionResponse.data || []) as AccountDeletionRequest[]) || [];
    const nextPosts = ((postsResponse.data || []) as RecentPost[]) || [];
    const nextRides = ((ridesResponse.data || []) as RecentRide[]) || [];

    const profileIds = Array.from(
      new Set(
        [
          ...nextReports.flatMap((report) => [
            report.reporter_id,
            report.reported_user_id,
          ]),
          ...nextDeletionRequests.flatMap((request) => [
            request.user_id,
            request.reviewed_by,
          ]),
          ...nextPosts.map((post) => post.user_id),
          ...nextRides.map((ride) => ride.host_id),
        ].filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const { data: profileRows, error: profileError } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, email, display_name, role, status, is_premium, premium_tier, premium_since, premium_expires_at, is_founding_blackcard, founding_blackcard_granted_at, created_at")
          .in("id", profileIds)
      : { data: [], error: null };

    if (profileError) {
      setModerationError(profileError.message);
    }

    setReports(nextReports);
    setReportedMessageTypes(
      new Map(
        (reportedMessages || []).map((row) => [row.id, row.message_type || "text"]),
      ),
    );
    setDeletionRequests(nextDeletionRequests);
    setRecentPosts(nextPosts);
    setRecentRides(nextRides);
    setModerationProfiles(
      new Map(((profileRows || []) as AdminProfile[]).map((item) => [item.id, item])),
    );
    setModerationLoading(false);
  }

  async function updateReportStatus(reportId: string, status: ReportActionStatus) {
    setModerationSavingId(reportId);
    setModerationError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId, status }),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string; report?: AdminReport }
        | null;

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update report.");
      }

      if (result?.report) {
        setReports((prev) =>
          prev.map((item) => (item.id === reportId ? { ...item, ...result.report } : item)),
        );
      }

      setSuccessMsg("Report status updated.");
    } catch (error) {
      setModerationError(error instanceof Error ? error.message : "Failed to update report.");
    } finally {
      setModerationSavingId(null);
    }
  }

  async function updateDeletionRequestStatus(requestId: string, status: DeletionActionStatus) {
    setModerationSavingId(requestId);
    setModerationError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/deletion-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status }),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            error?: string;
            request?: AccountDeletionRequest;
            completion?: {
              profileDisabled?: boolean;
              authBanned?: boolean;
              profileError?: string | null;
              authError?: string | null;
            } | null;
          }
        | null;

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update deletion request.");
      }

      if (result?.request) {
        setDeletionRequests((prev) =>
          prev.map((item) => (item.id === requestId ? { ...item, ...result.request } : item)),
        );
      }

      if (status === "completed") {
        const execution = result as { execution?: { ok?: boolean; steps?: Record<string, unknown> } };
        const stripe = execution?.execution?.steps?.stripe as
          | { canceledIds?: string[] }
          | undefined;
        const parts = [
          "Account deletion approved and executed.",
          stripe?.canceledIds?.length
            ? `Stripe subscriptions canceled (${stripe.canceledIds.length}).`
            : "No active Stripe subscriptions were found.",
          "User content removed and auth account deleted. Moderation audit retained.",
        ];
        setSuccessMsg(parts.join(" "));
      } else {
        setSuccessMsg("Deletion request status updated.");
      }
    } catch (error) {
      setModerationError(
        error instanceof Error ? error.message : "Failed to update deletion request.",
      );
    } finally {
      setModerationSavingId(null);
    }
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

      await Promise.all([fetchProfiles(), fetchModerationData()]);
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


  async function runMembershipAction(
    profileId: string,
    action: "grant" | "revoke" | "extend_30" | "extend_90" | "set_expiration" | "grant_founding" | "revoke_founding",
    expiresAt?: string,
  ) {
    setSavingId(profileId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/profiles/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action, expiresAt }),
      });

      const result = (await response.json().catch(() => null)) as
        | {
            error?: string;
            profile?: AdminProfile;
            subscription?: MembershipRow | null;
          }
        | null;

      if (!response.ok) {
        throw new Error(result?.error || "Membership action failed.");
      }

      if (result?.profile) {
        setProfiles((current) =>
          current.map((item) => (item.id === profileId ? { ...item, ...result.profile } : item)),
        );
      }

      setSubscriptionsByUserId((current) => ({
        ...current,
        [profileId]: result?.subscription ?? current[profileId] ?? null,
      }));

      setSuccessMsg("Membership updated.");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Membership action failed.");
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {[
                  {
                    eyebrow: "Blackcard",
                    title: "Membership controls",
                    href: "/admin/blackcard",
                    cta: "Members",
                  },
                  {
                    eyebrow: "Crimson Credits",
                    title: "Credits control center",
                    href: "/admin/credits",
                    cta: "Credits",
                  },
                  {
                    eyebrow: "Rewards",
                    title: "Rewards control room",
                    href: "/admin/rewards",
                    cta: "Rewards",
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

            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">
                    Social + Blackcard Phase 2
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Engagement Stats</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                    Monitor favorites, host meet subscriptions, and Blackcard-exclusive meet adoption.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  { label: "Favorite riders", value: socialStats.favorites },
                  { label: "Meet notify subs", value: socialStats.meetSubscriptions },
                  { label: "Blackcard meets", value: socialStats.blackcardMeets },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-2xl font-semibold text-white">{item.value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">
                    Launch Safety
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Moderation Dashboard</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                    Review reports, deletion requests, recent posts, and active meet activity. Use the
                    queue actions to update report and deletion-request status. Approving deletion cancels Stripe, removes user content, deletes the auth account, and retains moderation audit records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchModerationData()}
                  disabled={moderationLoading}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-zinc-300 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {moderationLoading ? "Loading" : "Refresh"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  { label: "Pending reports", value: pendingReportCount },
                  { label: "Deletion requests", value: pendingDeletionCount },
                  {
                    label: "Limited users",
                    value: profiles.filter((item) => item.status === "limited").length,
                  },
                  {
                    label: "Suspended/blocked",
                    value: profiles.filter((item) => ["suspended", "blocked"].includes(item.status || "")).length,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-2xl font-semibold text-white">{item.value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              {moderationError && (
                <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {moderationError}
                </div>
              )}

              {moderationLoading ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-3 w-24 rounded-full bg-white/10" />
                        <div className="h-5 w-56 max-w-full rounded-full bg-white/10" />
                        <div className="h-3 w-full rounded-full bg-white/10" />
                        <div className="h-3 w-2/3 rounded-full bg-white/10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="mb-4">
                      <h3 className="font-serif text-2xl text-white">Reports Queue</h3>
                    </div>

                    {reports.length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-500">
                        No reports have been submitted.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {reports.map((report) => {
                          const targetType = getAdminReportTargetType(report);
                          const targetRef = formatAdminReportTargetRef(report, reportedMessageTypes);

                          return (
                          <div key={report.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-white">
                                {report.reason || "Report"}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                                  {userReportTargetLabel(targetType)}
                                </span>
                                <span className="rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#e9b0b6]">
                                  {report.status || "pending"}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-zinc-500">
                              Reporter {getProfileLabel(report.reporter_id, moderationProfiles)}
                              {report.reported_user_id
                                ? ` • Reported ${getProfileLabel(report.reported_user_id, moderationProfiles)}`
                                : ""}
                              {targetRef ? ` • ${targetRef}` : ""}
                            </p>
                            {report.details && (
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                                {report.details}
                              </p>
                            )}
                            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                              {formatAdminDate(report.created_at)}
                            </p>
                            {!isReportClosed(report.status) && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={moderationSavingId === report.id}
                                  onClick={() => void updateReportStatus(report.id, "reviewing")}
                                  className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {moderationSavingId === report.id ? "Saving" : "Mark reviewed"}
                                </button>
                                <button
                                  type="button"
                                  disabled={moderationSavingId === report.id}
                                  onClick={() => void updateReportStatus(report.id, "resolved")}
                                  className="rounded-full border border-emerald-500/30 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-emerald-200/90 transition hover:border-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Resolve
                                </button>
                                <button
                                  type="button"
                                  disabled={moderationSavingId === report.id}
                                  onClick={() => void updateReportStatus(report.id, "dismissed")}
                                  className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-zinc-500 transition hover:border-white/25 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <AdminDeletionQueueSection
                    enabled={isAdmin && !moderationLoading}
                    highlightRequestId={searchParams.get("request")}
                  />

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <h3 className="mb-4 font-serif text-2xl text-white">Recent Posts</h3>
                    {recentPosts.length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-500">
                        No recent posts to review.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recentPosts.map((post) => (
                          <div key={post.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-white">
                                {getProfileLabel(post.user_id, moderationProfiles)}
                              </p>
                              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                                {post.post_type || "post"} • {post.media_status || "ready"}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                              {post.caption || post.location || "No caption"}
                            </p>
                            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                              {formatAdminDate(post.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <AdminRecentMeetsSection
                    rides={recentRides}
                    profiles={moderationProfiles}
                    onRideDeleted={(rideId) =>
                      setRecentRides((current) => current.filter((ride) => ride.id !== rideId))
                    }
                  />
                </div>
              )}
            </section>

            <AdminMembershipControls
              profiles={profiles}
              subscriptionsByUserId={subscriptionsByUserId}
              savingId={savingId}
              onAction={runMembershipAction}
            />

            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_1.2fr] md:items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#e87a82]">
                    User Management
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Quick Actions</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Role, status, and Blackcard membership controls are available in the Profiles table below.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Admins", value: profiles.filter((item) => item.role === "admin").length },
                    { label: "Moderators", value: profiles.filter((item) => item.role === "moderator").length },
                    { label: "Blackcard", value: profiles.filter((item) => getMembershipTier(item) === "blackcard").length },
                    { label: "Founding", value: profiles.filter((item) => getMembershipTier(item) === "founding").length },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="text-2xl font-semibold text-white">{item.value}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

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

                  const membership: MembershipTier = getMembershipTier(item);

                  const dropdownMembership: MembershipTier = getMembershipTier(item);

                  const isSaving = savingId === item.id;
                  const isSelf = isOwner;
                  const identity = item.username || item.display_name || "unknown-user";

                  const membershipControl = isAdminAccount ? (
                    <div className="flex min-h-10 items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm uppercase tracking-[0.18em] text-zinc-200">
                      ADMIN
                    </div>
                  ) : membership === "founding" ? (
                    <div className="flex min-h-10 items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm uppercase tracking-[0.18em] text-amber-100">
                      🏆 founding
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

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen overflow-hidden bg-[#050405] px-4 py-16 text-sm text-zinc-500">
          Loading admin…
        </main>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
