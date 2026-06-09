import { getNexusPhaseSummary } from "@/lib/memory/phase-tracker";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getNexusPhaseSummary(supabase)),
  "Failed to load NEXUS phase summary.",
);
