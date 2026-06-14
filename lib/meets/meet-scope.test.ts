import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildMeetCreditNotification,
  meetCreditNotificationGroupKey,
  shouldEmitMeetCreditNotification,
  CREDITS_HISTORY_PATH,
} from "@/lib/credits/meet-credit-notifications";
import {
  buildCoHostCandidateList,
  coHostAssignmentBlockedReason,
} from "@/lib/meets/co-host";
import {
  meetFooterActionLabel,
  resolveMeetFooterActions,
} from "@/lib/meets/footer-actions";
import { formatMeetHostDisplayLines } from "@/lib/meets/host-display";
import {
  dashboardMapSheetPrimaryActionLabel,
  resolveDashboardMapSheetPrimaryAction,
} from "@/lib/meets/dashboard-map-sheet-actions";
import { END_MEET_CONFIRM_TITLE } from "@/lib/meets/end-meet";
import { LEAVE_MEET_CONFIRM_TITLE } from "@/lib/meets/leave-meet";
import {
  canAssignCoHost,
  canManageMeetSettings,
  canModerateMeet,
  canRemoveRiderFromMeet,
  hasMeetCoHost,
  isMeetCoHost,
  isPrimaryMeetHost,
} from "@/lib/meets/permissions";
import { notificationDestination } from "@/lib/notifications";

const hostContext = { hostId: "host-1", coHostId: "cohost-1" as string | null };

describe("co-host permissions", () => {
  it("allows primary host to add co-host when slot is open", () => {
    assert.equal(canAssignCoHost({ hostId: "host-1", coHostId: null }, "host-1"), true);
    assert.equal(hasMeetCoHost({ hostId: "host-1", coHostId: null }), false);
  });

  it("enforces max one co-host", () => {
    assert.equal(
      coHostAssignmentBlockedReason({ hostId: "host-1", coHostId: "cohost-1" }, true),
      "This meet already has a co-host. Remove or change the current co-host first.",
    );
  });

  it("allows co-host to moderate but not manage settings", () => {
    assert.equal(canModerateMeet(hostContext, "cohost-1"), true);
    assert.equal(canManageMeetSettings(hostContext, "cohost-1"), false);
    assert.equal(isMeetCoHost(hostContext, "cohost-1"), true);
    assert.equal(isPrimaryMeetHost(hostContext, "cohost-1"), false);
  });

  it("prevents co-host from removing primary host", () => {
    assert.equal(canRemoveRiderFromMeet(hostContext, "cohost-1", "host-1"), false);
  });

  it("allows co-host to start and end via moderation rights", () => {
    assert.equal(canModerateMeet(hostContext, "cohost-1"), true);
  });
});

describe("co-host display", () => {
  it("formats hosted by and co-host lines", () => {
    const lines = formatMeetHostDisplayLines("Javi", "Crimson");
    assert.equal(lines.hostedBy, "Hosted by Javi");
    assert.equal(lines.coHostLine, "Co-host: Crimson");
  });

  it("omits co-host line when absent", () => {
    const lines = formatMeetHostDisplayLines("Javi", null);
    assert.equal(lines.hostedBy, "Hosted by Javi");
    assert.equal(lines.coHostLine, null);
  });
});

describe("meet details overflow menu", () => {
  it("keeps Report Meet in overflow menu only and preserves rider menu order", () => {
    const overflow = readFileSync("components/meets/MeetDetailsOverflowMenu.tsx", "utf8");
    const modal = readFileSync("components/meets/MeetDetailsModal.tsx", "utf8");

    const shareIndex = overflow.indexOf("Share Meet");
    const copyLinkIndex = overflow.indexOf("Copy Link");
    const copyRouteIndex = overflow.indexOf("Copy Route");
    const profileIndex = overflow.indexOf("View Host Profile");
    const reportIndex = overflow.indexOf("Report Meet");

    assert.ok(shareIndex > -1 && copyLinkIndex > shareIndex);
    assert.ok(copyRouteIndex > copyLinkIndex);
    assert.ok(reportIndex > profileIndex);
    assert.ok(overflow.includes("Edit Meet"));
    assert.ok(overflow.includes("Cancel Meet"));
    assert.equal(modal.includes('case "report"'), false);
    assert.equal(modal.includes('renderFooterAction("report")'), false);
    assert.equal(overflow.includes("createPortal"), true);
  });
});

describe("footer action deduplication", () => {
  it("never returns duplicate footer actions", () => {
    const actions = resolveMeetFooterActions({
      isPrimaryHost: true,
      isCoHost: false,
      isGoing: true,
      isCanceled: false,
      trackingStatus: "not_started",
      hasRoute: true,
      inviteJoinBlocked: false,
      hasMapsTarget: true,
    });

    assert.equal(new Set(actions).size, actions.length);
  });
});

describe("joined rider footer actions", () => {
  it("shows Navigate to Meet, Start Ride, and Leave Meet for joined riders", () => {
    const actions = resolveMeetFooterActions({
      isPrimaryHost: false,
      isCoHost: false,
      isGoing: true,
      isCanceled: false,
      trackingStatus: "not_started",
      hasRoute: true,
      inviteJoinBlocked: false,
      hasMapsTarget: true,
    });

    assert.deepEqual(actions, ["navigate", "start_ride", "leave"]);
    assert.equal(meetFooterActionLabel("start_ride"), "Start Ride");
    assert.equal(actions.includes("start_ride"), true);
    assert.notEqual(meetFooterActionLabel("start_ride"), "Start Tracking");
  });

  it("uses Join Meet before joined", () => {
    const actions = resolveMeetFooterActions({
      isPrimaryHost: false,
      isCoHost: false,
      isGoing: false,
      isCanceled: false,
      trackingStatus: "not_started",
      hasRoute: true,
      inviteJoinBlocked: false,
      hasMapsTarget: true,
    });

    assert.deepEqual(actions, ["navigate", "join"]);
  });
});

describe("host footer actions", () => {
  it("shows Navigate to Meet and Start Meet for upcoming host", () => {
    const actions = resolveMeetFooterActions({
      isPrimaryHost: true,
      isCoHost: false,
      isGoing: false,
      isCanceled: false,
      trackingStatus: "not_started",
      hasRoute: true,
      inviteJoinBlocked: false,
      hasMapsTarget: true,
    });

    assert.deepEqual(actions, ["navigate", "start_meet"]);
    assert.equal(meetFooterActionLabel("start_meet"), "Start Meet");
  });

  it("shows Start Ride and End Meet for live host without duplicate navigation", () => {
    const actions = resolveMeetFooterActions({
      isPrimaryHost: true,
      isCoHost: false,
      isGoing: false,
      isCanceled: false,
      trackingStatus: "active",
      hasRoute: true,
      inviteJoinBlocked: false,
      hasMapsTarget: true,
    });

    assert.deepEqual(actions, ["start_ride", "end_meet"]);
    assert.equal(meetFooterActionLabel("end_meet"), "End Meet");
    assert.equal(actions.includes("navigate"), false);
  });

  it("does not show Join Meet to host team", () => {
    const actions = resolveMeetFooterActions({
      isPrimaryHost: false,
      isCoHost: true,
      isGoing: false,
      isCanceled: false,
      trackingStatus: "active",
      hasRoute: true,
      inviteJoinBlocked: false,
      hasMapsTarget: true,
    });

    assert.equal(actions.includes("join"), false);
    assert.equal(actions.includes("leave"), false);
  });
});

describe("leave meet confirmation", () => {
  it("uses the required confirmation title", () => {
    assert.equal(LEAVE_MEET_CONFIRM_TITLE, "Leave this meet?");
  });
});

describe("end meet confirmation", () => {
  it("uses the required confirmation title", () => {
    assert.equal(END_MEET_CONFIRM_TITLE, "End this meet?");
  });
});

describe("dashboard map sheet primary actions", () => {
  it("shows Start Ride for live joined riders without duplicate navigation", () => {
    const action = resolveDashboardMapSheetPrimaryAction({
      hasRoute: true,
      lifecyclePhase: "active",
      trackingStatus: "active",
      isHostTeam: false,
      isGoing: true,
      hasMapsTarget: true,
    });

    assert.equal(action, "start_ride");
    assert.equal(dashboardMapSheetPrimaryActionLabel(action!), "Start Ride");
  });

  it("shows Navigate to Meet for active but not live joined riders", () => {
    const action = resolveDashboardMapSheetPrimaryAction({
      hasRoute: true,
      lifecyclePhase: "active",
      trackingStatus: "not_started",
      isHostTeam: false,
      isGoing: true,
      hasMapsTarget: true,
    });

    assert.equal(action, "navigate_in_app");
    assert.equal(dashboardMapSheetPrimaryActionLabel(action!), "Navigate to Meet");
  });

  it("shows external navigation for upcoming not-joined riders", () => {
    const action = resolveDashboardMapSheetPrimaryAction({
      hasRoute: true,
      lifecyclePhase: "upcoming",
      trackingStatus: "not_started",
      isHostTeam: false,
      isGoing: false,
      hasMapsTarget: true,
    });

    assert.equal(action, "navigate_external");
  });
});

describe("co-host candidate list", () => {
  it("prefers joined riders and blocks primary host", () => {
    const candidates = buildCoHostCandidateList(
      [
        { id: "rider-1", name: "Crimson", username: "crimson", photo: "/icon.png" },
        { id: "host-1", name: "Javi", username: "javi", photo: "/icon.png" },
      ],
      [{ id: "member-2", name: "Member", username: "member", photo: "/icon.png" }],
      { hostId: "host-1", coHostId: null },
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.id),
      ["rider-1", "member-2"],
    );
  });
});

describe("meet credit notifications", () => {
  it("builds attend, host, and co-host reward copy", () => {
    assert.equal(
      buildMeetCreditNotification({ role: "attend", amount: 10, meetName: "Night Run" }).body,
      "You earned 10 Crimson Credits for attending Night Run.",
    );
    assert.equal(
      buildMeetCreditNotification({ role: "host", amount: 20, meetName: "Night Run" }).body,
      "You earned 20 Crimson Credits for hosting Night Run.",
    );
    assert.equal(
      buildMeetCreditNotification({ role: "cohost", amount: 20, meetName: "Night Run" }).body,
      "You earned 20 Crimson Credits for co-hosting Night Run.",
    );
  });

  it("uses idempotent notification group keys", () => {
    assert.equal(
      meetCreditNotificationGroupKey("user-1", "meet_attend:user-1:ride-1"),
      "crimson_credits_reward:user-1:meet_attend:user-1:ride-1",
    );
  });

  it("skips notifications for duplicate awards", () => {
    assert.equal(shouldEmitMeetCreditNotification({ awarded: 0, duplicate: true }), false);
    assert.equal(shouldEmitMeetCreditNotification({ awarded: 10, duplicate: false }), true);
  });

  it("routes credit reward notifications to credits history", () => {
    assert.equal(
      notificationDestination({
        type: "crimson_credits_reward",
        ride_id: "ride-1",
        metadata: {
          entity_type: "crimson_credits_reward",
          route: CREDITS_HISTORY_PATH,
          meet_id: "ride-1",
          amount: 10,
          reason: "meet_attended",
        },
      }, null),
      "/profile/credits/history",
    );
  });
});
