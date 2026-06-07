import { getNexusScenarios } from "@/lib/scenarios/engine";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getNexusScenarios(supabase)),
  "Failed to load Strategic Scenario Engine.",
);
