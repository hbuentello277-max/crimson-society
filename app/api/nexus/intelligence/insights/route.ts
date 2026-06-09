import { getCrossSystemInsightsPayload } from "@/lib/cross-system-intelligence/engine";
import { crossSystemIntelligenceReadRoute } from "@/lib/cross-system-intelligence/route-handler";
import { nexusOk } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = crossSystemIntelligenceReadRoute(async ({ supabase }) =>
  nexusOk(await getCrossSystemInsightsPayload(supabase)),
);
