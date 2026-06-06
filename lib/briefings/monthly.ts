import type { SupabaseClient } from "@supabase/supabase-js";
import { composeMonthlyBriefing } from "@/lib/briefings/formatter";
import { loadReportContext } from "@/lib/reports/context";
import type { MonthlyOwnerBriefing } from "@/lib/briefings/types";

export async function getMonthlyOwnerBriefing(
  supabase: SupabaseClient,
): Promise<MonthlyOwnerBriefing> {
  const context = await loadReportContext(supabase);
  return composeMonthlyBriefing(context);
}
