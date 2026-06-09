import { getExecutiveCommandSummary } from "@/lib/executive-command/engine";
import { executiveCommandReadRoute } from "@/lib/executive-command/route-handler";
import { nexusOk } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = executiveCommandReadRoute(async ({ supabase, access }) =>
  nexusOk(await getExecutiveCommandSummary(supabase, access)),
);
