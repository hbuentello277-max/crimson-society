import { getNexusMissionControl } from "@/lib/mission-control/engine";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getNexusMissionControl(supabase)),
  "Failed to load Founder Platform Control.",
);
