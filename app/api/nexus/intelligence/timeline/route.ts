import { getCrossSystemTimeline } from "@/lib/cross-system-intelligence/engine";
import { crossSystemIntelligenceReadRoute } from "@/lib/cross-system-intelligence/route-handler";
import { nexusOk } from "@/lib/nexus/route-handler";
import type { CrossSystemTimelineWindow } from "@/lib/cross-system-intelligence/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseWindow(value: string | null): CrossSystemTimelineWindow {
  if (value === "24h" || value === "30d") return value;
  return "7d";
}

export const GET = crossSystemIntelligenceReadRoute(async ({ supabase, request }) => {
  const window = parseWindow(new URL(request.url).searchParams.get("window"));
  return nexusOk(await getCrossSystemTimeline(supabase, window));
});
