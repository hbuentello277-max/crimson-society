import { getNexusOperationalIntelligence } from "@/lib/operational-intelligence/engine";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getNexusOperationalIntelligence(supabase)),
  "Failed to load operational intelligence.",
);
