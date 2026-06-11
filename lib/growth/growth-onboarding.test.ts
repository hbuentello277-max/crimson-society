import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReferralSignupUrl,
  readReferralCodeFromSignupUrl,
  referralShareText,
} from "@/lib/credits/referral-link";
import { validateReferralCodeFormat } from "@/lib/credits/referral-code";
import {
  foundingLeaderboardDisplayName,
  parseFoundingLeaderboardPayload,
} from "@/lib/growth/founding-leaderboard";
import {
  buildRiderOnboardingStatus,
  hasCompleteRide,
  isRideComplete,
  parseRiderOnboardingRpcPayload,
  shouldShowRiderChecklist,
} from "@/lib/growth/rider-checklist";

describe("rider onboarding checklist", () => {
  it("computes 50% progress per completed task", () => {
    const half = buildRiderOnboardingStatus({
      profile: { username: "rider1", display_name: "Rider One" },
      motorcycles: [],
    });
    assert.equal(half.progressPercent, 50);
    assert.equal(half.onboardingComplete, false);

    const full = buildRiderOnboardingStatus({
      profile: { username: "rider1", display_name: "Rider One" },
      motorcycles: [{ name: "Ducati Panigale", year: "2023" }],
    });
    assert.equal(full.progressPercent, 100);
    assert.equal(full.onboardingComplete, true);
  });

  it("requires year and make/model for ride completion", () => {
    assert.equal(isRideComplete({ name: "Ducati Panigale", year: "2023" }), true);
    assert.equal(isRideComplete({ name: "Ducati Panigale", year: "" }), false);
    assert.equal(isRideComplete({ name: "", year: "2023" }), false);
    assert.equal(hasCompleteRide([{ name: "Yamaha R1", year: "2021" }]), true);
  });

  it("does not require bio or socials for profile completion", () => {
    const status = buildRiderOnboardingStatus({
      profile: { username: "rider1", display_name: "Rider One" },
      motorcycles: [],
    });
    assert.equal(status.profileComplete, true);
  });

  it("hides checklist after credits are awarded", () => {
    const done = buildRiderOnboardingStatus({
      profile: { username: "rider1", display_name: "Rider One" },
      motorcycles: [{ name: "Ducati Panigale", year: "2023" }],
      creditsAwarded: true,
    });
    assert.equal(shouldShowRiderChecklist(done), false);
  });

  it("parses onboarding RPC payload", () => {
    const parsed = parseRiderOnboardingRpcPayload({
      profile_complete: true,
      ride_added: false,
      progress_percent: 50,
      onboarding_complete: false,
      credits_awarded: false,
      reward_amount: 100,
    });
    assert.equal(parsed.profileComplete, true);
    assert.equal(parsed.rewardAmount, 100);
  });
});

describe("founding leaderboard", () => {
  it("parses leaderboard payload with current user", () => {
    const parsed = parseFoundingLeaderboardPayload({
      entries: [
        {
          rank: 1,
          user_id: "u1",
          username: "alpha",
          display_name: "Alpha",
          avatar_url: null,
          points: 200,
          profile_points: 100,
          attend_points: 0,
          host_points: 0,
          referral_signup_points: 100,
          referral_blackcard_points: 0,
          is_current_user: true,
          in_top_15: true,
        },
      ],
      current_user: {
        rank: 1,
        points: 200,
        in_top_15: true,
        profile_points: 100,
        attend_points: 0,
        host_points: 0,
        referral_signup_points: 100,
        referral_blackcard_points: 0,
      },
      top_n: 15,
      cutoff_points: 120,
      scoring: {
        profile_complete: 100,
        attend_meet: 10,
        host_meet: 20,
        referral_signup: 25,
        referral_blackcard: 50,
      },
    });

    assert.equal(parsed.entries.length, 1);
    assert.equal(parsed.currentUser.rank, 1);
    assert.equal(parsed.cutoffPoints, 120);
    assert.equal(foundingLeaderboardDisplayName(parsed.entries[0]), "Alpha");
  });
});

describe("referral link helpers", () => {
  it("builds signup URL with ref query param", () => {
    const url = buildReferralSignupUrl("Rider_R1", "https://example.com");
    assert.equal(url, "https://example.com/signup?ref=Rider_R1");
  });

  it("reads referral code from signup search params", () => {
    assert.equal(readReferralCodeFromSignupUrl("?ref=rider-210"), "rider-210");
    assert.equal(readReferralCodeFromSignupUrl(new URLSearchParams("ref=JJAY.MICK")), "JJAY.MICK");
  });

  it("builds share text with code and link", () => {
    const text = referralShareText("JAVI10", "https://example.com/signup?ref=JAVI10");
    assert.match(text, /JAVI10/);
    assert.match(text, /signup\?ref=JAVI10/);
  });
});

describe("referral code validation", () => {
  it("accepts flexible referral codes", () => {
    assert.equal(validateReferralCodeFormat("JAVI10"), null);
    assert.equal(validateReferralCodeFormat("Rider_R1"), null);
    assert.equal(validateReferralCodeFormat("rider-210"), null);
    assert.equal(validateReferralCodeFormat("JJAY.MICK"), null);
  });

  it("rejects spaces and unsafe symbols", () => {
    assert.notEqual(validateReferralCodeFormat("bad code!"), null);
    assert.notEqual(validateReferralCodeFormat("unsafe?code"), null);
    assert.notEqual(validateReferralCodeFormat("bad/code"), null);
    assert.notEqual(validateReferralCodeFormat("  "), null);
  });
});
