import { BLACKCARD_MEMBERSHIP_PERKS } from "@/lib/blackcard/perks";
import type { MembershipPlan } from "@/components/blackcard/types";

/** Plan perks from DB, or marketing defaults when the array is empty. */
export function resolveBlackcardPlanPerks(plan: Pick<MembershipPlan, "perks">): string[] {
  const fromDb = plan.perks.map((item) => item.trim()).filter(Boolean);
  if (fromDb.length > 0) {
    return fromDb;
  }
  return [...BLACKCARD_MEMBERSHIP_PERKS];
}
