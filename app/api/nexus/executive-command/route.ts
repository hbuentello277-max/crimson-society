import { getExecutiveCommandSummary } from "@/lib/executive-command/engine";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getExecutiveCommandSummary(supabase)),
  "Failed to load Executive Command Center.",
);
