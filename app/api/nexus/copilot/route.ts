import { getNexusCopilot } from "@/lib/copilot/engine";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getNexusCopilot(supabase)),
  "Failed to load Founder Copilot.",
);
