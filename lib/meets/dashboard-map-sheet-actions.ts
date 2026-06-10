import type { MeetLifecyclePhase } from "@/lib/meets/lifecycle";
import type { MeetTrackingStatus } from "@/lib/meets/types";

export type DashboardMapSheetActionInput = {
  hasRoute: boolean;
  lifecyclePhase: MeetLifecyclePhase;
  trackingStatus: MeetTrackingStatus | string | null;
  isHostTeam: boolean;
  isGoing: boolean;
  hasMapsTarget: boolean;
};

export type DashboardMapSheetPrimaryAction =
  | "start_ride"
  | "navigate_in_app"
  | "navigate_external"
  | null;

export function resolveDashboardMapSheetPrimaryAction(
  input: DashboardMapSheetActionInput,
): DashboardMapSheetPrimaryAction {
  const trackingStatus = input.trackingStatus ?? "not_started";
  const isRideLive = trackingStatus === "active";
  const canUseInAppNavigation = input.isHostTeam || input.isGoing;

  if (input.hasRoute && isRideLive && canUseInAppNavigation) {
    return "start_ride";
  }

  if (
    input.hasRoute &&
    input.lifecyclePhase === "active" &&
    canUseInAppNavigation
  ) {
    return "navigate_in_app";
  }

  if (input.hasMapsTarget) {
    return "navigate_external";
  }

  return null;
}

export function dashboardMapSheetPrimaryActionLabel(
  action: Exclude<DashboardMapSheetPrimaryAction, null>,
): string {
  switch (action) {
    case "start_ride":
      return "Start Ride";
    case "navigate_in_app":
    case "navigate_external":
      return "Navigate to Meet";
  }
}
