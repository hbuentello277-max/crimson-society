import { getNexusIntelligence } from "@/lib/intelligence/engine";
import type { IntelligenceSort } from "@/lib/intelligence/types";
import { nexusOk, ownerReadRouteWithRequest } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSort(value: string | null): IntelligenceSort {
  return value === "confidence" ? "confidence" : "impact";
}

export const GET = ownerReadRouteWithRequest(
  async ({ supabase, request }) => {
    const sort = parseSort(new URL(request.url).searchParams.get("sort"));
    return nexusOk(await getNexusIntelligence(supabase, { sort }));
  },
  "Failed to load Nexus intelligence.",
);
