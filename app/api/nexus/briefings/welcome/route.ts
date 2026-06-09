import { generateWelcomeBriefing } from "@/lib/proactive-intelligence/welcome-briefing";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await generateWelcomeBriefing(supabase)),
  "Failed to load welcome briefing.",
);
