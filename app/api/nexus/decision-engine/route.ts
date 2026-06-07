import { getNexusDecisionEngine } from "@/lib/decision-engine/engine";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getNexusDecisionEngine(supabase)),
  "Failed to load Executive Decision Engine.",
);
