import type { MeetTrackingStatus } from "@/lib/meets/types";

export type MeetFooterAction =
  | "navigate"
  | "start_meet"
  | "start_ride"
  | "join"
  | "leave";

export type MeetFooterActionInput = {
  isPrimaryHost: boolean;
  isCoHost: boolean;
  isGoing: boolean;
  isCanceled: boolean;
  trackingStatus?: MeetTrackingStatus | string | null;
  hasRoute: boolean;
  inviteJoinBlocked: boolean;
  hasMapsTarget: boolean;
};

export function resolveMeetFooterActions(input: MeetFooterActionInput): MeetFooterAction[] {
  const actions: MeetFooterAction[] = [];
  const isHostTeam = input.isPrimaryHost || input.isCoHost;
  const trackingStatus = input.trackingStatus ?? "not_started";
  const isRideLive = trackingStatus === "active";
  const isRideEnded = trackingStatus === "ended";

  if (input.hasMapsTarget && !isRideEnded) {
    actions.push("navigate");
  }

  if (isHostTeam && !input.isCanceled && trackingStatus === "not_started") {
    actions.push("start_meet");
  }

  if (input.hasRoute && !input.isCanceled) {
    if (isHostTeam && isRideLive) {
      actions.push("start_ride");
    } else if (!isHostTeam && input.isGoing) {
      actions.push("start_ride");
    }
  }

  if (!isHostTeam && !input.isCanceled) {
    if (input.isGoing) {
      actions.push("leave");
    } else if (!input.inviteJoinBlocked) {
      actions.push("join");
    }
  }

  return actions;
}

export function meetFooterActionLabel(action: MeetFooterAction): string {
  switch (action) {
    case "navigate":
      return "Navigate to Meet";
    case "start_meet":
      return "Start Meet";
    case "start_ride":
      return "Start Ride";
    case "join":
      return "Join Meet";
    case "leave":
      return "Leave Meet";
  }
}
