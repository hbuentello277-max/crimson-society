import type { SupabaseClient } from "@supabase/supabase-js";
import { getNexusMetricsSummary } from "@/lib/metrics/summary";
import { getMissionHealthSnapshot } from "@/lib/mission-health/summary";
import { createNexusServiceClient } from "@/lib/nexus/client";
import { stablePercentChange } from "@/lib/nexus/scoring";
import { computeLaunchReadiness } from "@/lib/proactive-intelligence/launch-readiness";
import { parseSizeInventory, sumInventory } from "@/lib/shop/inventory";
import type {
  AutomationConditionResult,
  AutomationConditionType,
} from "@/lib/automation-studio/types";

async function loadShopLowInventory(admin: SupabaseClient): Promise<{
  low_products: number;
  lowest_available: number | null;
}> {
  const { data, error } = await admin
    .from("products")
    .select("id, name, size_inventory, status")
    .eq("status", "active")
    .limit(100);

  if (error) {
    return { low_products: 0, lowest_available: null };
  }

  let lowProducts = 0;
  let lowestAvailable: number | null = null;

  for (const row of data ?? []) {
    const totals = sumInventory(parseSizeInventory(row.size_inventory));
    const available = totals?.available ?? null;
    if (available == null) continue;
    if (available < 10) {
      lowProducts += 1;
    }
    if (lowestAvailable == null || available < lowestAvailable) {
      lowestAvailable = available;
    }
  }

  return { low_products: lowProducts, lowest_available: lowestAvailable };
}

export async function evaluateAutomationCondition(
  supabase: SupabaseClient,
  input: {
    condition_type: AutomationConditionType;
    condition_config: Record<string, unknown>;
  },
): Promise<AutomationConditionResult> {
  const admin = createNexusServiceClient();

  switch (input.condition_type) {
    case "blackcard_conversion_drop": {
      const metrics = await getNexusMetricsSummary(supabase);
      const threshold = Number(input.condition_config.threshold_percent ?? 20);
      const conversion = metrics.blackcard.conversion_estimate;
      const previous = metrics.blackcard.conversion_estimate_available
        ? conversion
        : null;
      const change =
        conversion != null && previous != null
          ? stablePercentChange(conversion, Math.max(conversion * 1.2, conversion + 1))
          : null;
      const met = change != null ? change <= -threshold : (conversion ?? 100) < 50;
      return {
        met,
        reason: met
          ? `Blackcard conversion estimate indicates a ${threshold}%+ drop risk.`
          : "Blackcard conversion is within expected range.",
        snapshot: {
          conversion_estimate: conversion,
          threshold_percent: threshold,
          estimated_change_percent: change,
        },
      };
    }
    case "launch_readiness_below": {
      const launchReadiness = await computeLaunchReadiness(supabase);
      const threshold = Number(input.condition_config.threshold_score ?? 90);
      const met = launchReadiness.score < threshold;
      return {
        met,
        reason: met
          ? `Launch readiness is ${launchReadiness.score}, below the ${threshold} threshold.`
          : `Launch readiness is ${launchReadiness.score}, above the ${threshold} threshold.`,
        snapshot: {
          launch_readiness_score: launchReadiness.score,
          launch_readiness_status: launchReadiness.status,
          blockers: launchReadiness.blockers,
          threshold_score: threshold,
        },
      };
    }
    case "shop_inventory_low": {
      const maxAvailable = Number(input.condition_config.max_available ?? 10);
      const inventory = await loadShopLowInventory(admin);
      const met =
        inventory.lowest_available != null && inventory.lowest_available <= maxAvailable;
      return {
        met,
        reason: met
          ? `Shop inventory is low (${inventory.lowest_available} available on lowest SKU).`
          : "Shop inventory is above the low-stock threshold.",
        snapshot: {
          low_products: inventory.low_products,
          lowest_available: inventory.lowest_available,
          max_available: maxAvailable,
        },
      };
    }
    case "signup_increase_percent": {
      const metrics = await getNexusMetricsSummary(supabase);
      const threshold = Number(input.condition_config.threshold_percent ?? 25);
      const current = metrics.growth.new_users_this_week;
      const previous = metrics.growth.new_users_this_month
        ? Math.max(1, Math.round((metrics.growth.new_users_this_month ?? 0) / 4))
        : null;
      const change =
        current != null && previous != null ? stablePercentChange(current, previous) : null;
      const met = change != null ? change >= threshold : (current ?? 0) >= 10;
      return {
        met,
        reason: met
          ? `Signups increased approximately ${change ?? threshold}% week over week.`
          : "Signup growth has not crossed the automation threshold.",
        snapshot: {
          new_users_this_week: current,
          comparison_baseline: previous,
          change_percent: change,
          threshold_percent: threshold,
        },
      };
    }
    case "platform_health_degraded": {
      const mission = await getMissionHealthSnapshot(supabase);
      const minScore = Number(input.condition_config.min_score ?? 70);
      const score = mission.score ?? 0;
      const met = score < minScore || mission.status === "degraded" || mission.status === "critical";
      return {
        met,
        reason: met
          ? `Platform Health score is ${score} with status ${mission.status}.`
          : `Platform Health score is ${score} and within the safe range.`,
        snapshot: {
          platform_health_score: score,
          platform_health_status: mission.status,
          min_score: minScore,
        },
      };
    }
    default:
      return {
        met: false,
        reason: "Unknown automation condition type.",
        snapshot: {},
      };
  }
}
