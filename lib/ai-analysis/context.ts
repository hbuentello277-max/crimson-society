import type { SupabaseClient } from "@supabase/supabase-js";
import { loadChatContext, type ChatContext } from "@/lib/chat/context";
import { runCached } from "@/lib/nexus/request-cache";

export type AnalysisContext = ChatContext;

export function loadAnalysisContext(supabase: SupabaseClient): Promise<AnalysisContext> {
  return runCached(supabase, "nexus:ai-analysis-context", () => loadChatContext(supabase));
}
