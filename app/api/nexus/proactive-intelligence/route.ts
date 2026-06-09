import { getProactiveIntelligenceSummary } from "@/lib/proactive-intelligence/engine";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getProactiveIntelligenceSummary(supabase)),
  "Failed to load proactive intelligence.",
);
