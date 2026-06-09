import { retrieveFounderMemory, resolveMemoryQueryIntent } from "@/lib/memory/retrieval";
import { nexusOk, ownerReadRouteWithRequest } from "@/lib/nexus/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = ownerReadRouteWithRequest(async ({ supabase, request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const intentParam = url.searchParams.get("intent")?.trim() ?? "";
  const intent = resolveMemoryQueryIntent(query) ?? (intentParam as never) ?? "summarize_memory";

  if (!query) {
    return nexusOk(await retrieveFounderMemory(supabase, "summarize founder memory", "summarize_memory"));
  }

  return nexusOk(await retrieveFounderMemory(supabase, query, intent));
}, "Failed to retrieve founder memory.");