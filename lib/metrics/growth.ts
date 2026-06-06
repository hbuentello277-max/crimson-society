import type { SupabaseClient } from "@supabase/supabase-js";
import { RESTRICTED_ACCOUNT_STATUSES } from "@/lib/account-status";
import {
  addWarning,
  countAuthUsers,
  countTableRows,
  daysAgoIso,
  startOfUtcDayIso,
} from "@/lib/metrics/query-utils";
import type { GrowthMetrics } from "@/lib/metrics/types";

export async function collectGrowthMetrics(admin: SupabaseClient): Promise<GrowthMetrics> {
  const warnings: GrowthMetrics["warnings"] = [];
  const todayStart = startOfUtcDayIso();
  const weekStart = daysAgoIso(7);
  const monthStart = daysAgoIso(30);

  const [
    totalUsers,
    newUsersTodayProfiles,
    newUsersWeekProfiles,
    newUsersMonthProfiles,
    newUsersTodayAuth,
    activeProfiles,
    restrictedProfiles,
    deletedProfiles,
    deletionPendingProfiles,
    pendingDeletionRequests,
  ] = await Promise.all([
    countAuthUsers(admin),
    countTableRows(admin, "profiles", { sinceIso: todayStart }),
    countTableRows(admin, "profiles", { sinceIso: weekStart }),
    countTableRows(admin, "profiles", { sinceIso: monthStart }),
    countAuthUsers(admin, { sinceIso: todayStart }),
    countTableRows(admin, "profiles", {
      filters: [{ column: "status", op: "eq", value: "active" }],
    }),
    countTableRows(admin, "profiles", {
      filters: [{ column: "status", op: "in", value: [...RESTRICTED_ACCOUNT_STATUSES] }],
    }),
    countTableRows(admin, "profiles", {
      filters: [{ column: "status", op: "eq", value: "deleted" }],
    }),
    countTableRows(admin, "profiles", {
      filters: [{ column: "status", op: "eq", value: "deletion_pending" }],
    }),
    countTableRows(admin, "account_deletion_requests", {
      filters: [{ column: "status", op: "in", value: ["pending", "reviewing"] }],
    }),
  ]);

  if (totalUsers.error) {
    addWarning(warnings, "auth.users", totalUsers.error);
  }

  if (newUsersTodayProfiles.error) {
    addWarning(warnings, "profiles.new_today", newUsersTodayProfiles.error);
  }

  if (newUsersWeekProfiles.error) {
    addWarning(warnings, "profiles.new_week", newUsersWeekProfiles.error);
  }

  if (newUsersMonthProfiles.error) {
    addWarning(warnings, "profiles.new_month", newUsersMonthProfiles.error);
  }

  if (newUsersTodayAuth.error) {
    addWarning(warnings, "auth.users.new_today", newUsersTodayAuth.error);
  }

  if (activeProfiles.error) {
    addWarning(warnings, "profiles.active", activeProfiles.error);
  }

  if (restrictedProfiles.error) {
    addWarning(warnings, "profiles.restricted", restrictedProfiles.error);
  }

  if (deletedProfiles.error) {
    addWarning(warnings, "profiles.deleted", deletedProfiles.error);
  }

  if (deletionPendingProfiles.error) {
    addWarning(warnings, "profiles.deletion_pending", deletionPendingProfiles.error);
  }

  if (pendingDeletionRequests.error) {
    addWarning(warnings, "account_deletion_requests", pendingDeletionRequests.error);
  }

  const newUsersToday =
    newUsersTodayProfiles.count !== null && newUsersTodayAuth.count !== null
      ? Math.max(newUsersTodayProfiles.count, newUsersTodayAuth.count)
      : (newUsersTodayProfiles.count ?? newUsersTodayAuth.count);

  return {
    total_users: totalUsers.error ? null : totalUsers.count,
    new_users_today: newUsersToday,
    new_users_this_week: newUsersWeekProfiles.error ? null : newUsersWeekProfiles.count,
    new_users_this_month: newUsersMonthProfiles.error ? null : newUsersMonthProfiles.count,
    active_profiles: activeProfiles.error ? null : activeProfiles.count,
    restricted_profiles: restrictedProfiles.error ? null : restrictedProfiles.count,
    deleted_profiles: deletedProfiles.error ? null : deletedProfiles.count,
    deletion_pending_profiles: deletionPendingProfiles.error ? null : deletionPendingProfiles.count,
    pending_deletion_requests: pendingDeletionRequests.error ? null : pendingDeletionRequests.count,
    warnings,
  };
}
