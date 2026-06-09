import { generateMorningBriefing } from "@/lib/proactive-intelligence/morning-briefing";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await generateMorningBriefing(supabase)),
  "Failed to load morning briefing.",
);
