import { getNexusForecasting } from "@/lib/forecasting/engine";
import { nexusOk, ownerReadRoute } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRoute(
  async ({ supabase }) => nexusOk(await getNexusForecasting(supabase)),
  "Failed to load Nexus forecasting.",
);
