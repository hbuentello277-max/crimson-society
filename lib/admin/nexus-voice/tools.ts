import type { SupabaseClient } from "@supabase/supabase-js";
import { isNexusVoiceAiConfigured } from "@/lib/admin/nexus-voice/config";
import { runNexusVoiceActionReadTool } from "@/lib/admin/nexus-voice/action-tools";
import { runNexusVoiceMonitoringTool } from "@/lib/admin/nexus-voice/monitoring-tools";
import type { NexusVoiceActionResult, NexusVoiceToolName } from "@/lib/admin/nexus-voice/types";
import { runNexusVoiceFounderTool } from "@/lib/admin/nexus-voice/founder-tools";
import {
  NEXUS_VOICE_ACTION_READ_TOOLS,
  NEXUS_VOICE_FOUNDER_TOOLS,
  NEXUS_VOICE_MONITORING_TOOLS,
  NEXUS_VOICE_PHASE2_TOOLS,
} from "@/lib/admin/nexus-voice/types";

function startOfUtcDayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function formatCentsUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

async function getMemberCount(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .neq("status", "deleted");

  if (error) {
    throw new Error(error.message);
  }

  return {
    tool: "getMemberCount",
    data: { count: count ?? 0 },
  };
}

async function getBlackcardCount(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .neq("status", "deleted")
    .or(
      "membership_tier.eq.blackcard,membership_tier.eq.founding,is_founding_blackcard.eq.true,and(is_premium.eq.true,premium_tier.eq.blackcard)",
    );

  if (error) {
    throw new Error(error.message);
  }

  return {
    tool: "getBlackcardCount",
    data: { count: count ?? 0 },
  };
}

async function getRecentSignups(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("profiles")
    .select("id, username, display_name, created_at")
    .gte("created_at", since)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  const signups = (data || []).map((row) => ({
    id: row.id as string,
    username: (row.username as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
  }));

  return {
    tool: "getRecentSignups",
    data: {
      windowDays: 7,
      count: signups.length,
      signups,
    },
  };
}

async function getPendingReports(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const { count, error } = await admin
    .from("user_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  return {
    tool: "getPendingReports",
    data: { count: count ?? 0 },
  };
}

async function getRevenueToday(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const startIso = startOfUtcDayIso();

  const { data, error } = await admin
    .from("shop_orders")
    .select("total_cents")
    .eq("status", "paid")
    .gte("created_at", startIso);

  if (error) {
    throw new Error(error.message);
  }

  const totalCents = (data || []).reduce(
    (sum, row) => sum + Number((row as { total_cents?: number }).total_cents ?? 0),
    0,
  );
  const orderCount = data?.length ?? 0;

  return {
    tool: "getRevenueToday",
    data: {
      totalCents,
      formatted: formatCentsUsd(totalCents),
      orderCount,
      currency: "USD",
      window: "utc_day",
    },
  };
}

async function getSystemStatus(admin: SupabaseClient): Promise<NexusVoiceActionResult> {
  const checks: Record<string, "ok" | "degraded" | "missing"> = {
    database: "ok",
    openai: isNexusVoiceAiConfigured() ? "ok" : "missing",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? "ok" : "missing",
    supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "ok" : "missing",
  };

  const { error } = await admin.from("profiles").select("id", { count: "exact", head: true }).limit(1);
  if (error) {
    checks.database = "degraded";
  }

  const degraded = Object.values(checks).some((value) => value !== "ok");

  return {
    tool: "getSystemStatus",
    data: {
      status: degraded ? "degraded" : "healthy",
      checks,
      checkedAt: new Date().toISOString(),
    },
  };
}

const PHASE2_RUNNERS = {
  getMemberCount,
  getBlackcardCount,
  getRecentSignups,
  getPendingReports,
  getRevenueToday,
  getSystemStatus,
} as const;

function isPhase2Tool(tool: NexusVoiceToolName): tool is (typeof NEXUS_VOICE_PHASE2_TOOLS)[number] {
  return (NEXUS_VOICE_PHASE2_TOOLS as readonly string[]).includes(tool);
}

function isActionReadTool(tool: NexusVoiceToolName): tool is (typeof NEXUS_VOICE_ACTION_READ_TOOLS)[number] {
  return (NEXUS_VOICE_ACTION_READ_TOOLS as readonly string[]).includes(tool);
}

function isMonitoringTool(tool: NexusVoiceToolName): tool is (typeof NEXUS_VOICE_MONITORING_TOOLS)[number] {
  return (NEXUS_VOICE_MONITORING_TOOLS as readonly string[]).includes(tool);
}

function isFounderTool(tool: NexusVoiceToolName): tool is (typeof NEXUS_VOICE_FOUNDER_TOOLS)[number] {
  return (NEXUS_VOICE_FOUNDER_TOOLS as readonly string[]).includes(tool);
}

export type NexusVoiceToolOptions = {
  transcript?: string;
  founderMode?: import("@/lib/founder-personality/types").FounderMode;
};

export async function runNexusVoiceTool(
  tool: NexusVoiceToolName,
  admin: SupabaseClient,
  options: NexusVoiceToolOptions = {},
): Promise<NexusVoiceActionResult> {
  if (isPhase2Tool(tool)) {
    return PHASE2_RUNNERS[tool](admin);
  }

  if (isActionReadTool(tool)) {
    return runNexusVoiceActionReadTool(tool, admin);
  }

  if (isMonitoringTool(tool)) {
    return runNexusVoiceMonitoringTool(tool, admin);
  }

  if (isFounderTool(tool)) {
    return runNexusVoiceFounderTool(tool, admin, options);
  }

  throw new Error(`Tool ${tool} requires confirmation and cannot run directly.`);
}
