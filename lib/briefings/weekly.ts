import type { SupabaseClient } from "@supabase/supabase-js";
import { composeWeeklyBriefing } from "@/lib/briefings/formatter";
import { loadReportContext } from "@/lib/reports/context";
import type { WeeklyOwnerBriefing } from "@/lib/briefings/types";

export async function getWeeklyOwnerBriefing(
  supabase: SupabaseClient,
): Promise<WeeklyOwnerBriefing> {
  const context = await loadReportContext(supabase);
  return composeWeeklyBriefing(context);
}
