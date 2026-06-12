import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  membershipTierLabel,
  resolveMembershipTier,
  type MembershipRow,
} from "@/lib/membership";

const activeMembership: MembershipRow = {
  status: "active",
  plan_type: "monthly",
  current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
};

describe("resolveMembershipTier", () => {
  it("prioritizes founder over founding and blackcard", () => {
    assert.equal(
      resolveMembershipTier({
        membership: activeMembership,
        profile: {
          is_founder_blackcard: true,
          is_founding_blackcard: true,
          is_premium: true,
          premium_tier: "blackcard",
        },
      }),
      "founder",
    );
  });

  it("prioritizes founding over stripe blackcard", () => {
    assert.equal(
      resolveMembershipTier({
        membership: activeMembership,
        profile: { is_founding_blackcard: true },
      }),
      "founding",
    );
  });

  it("grants blackcard from active subscription", () => {
    assert.equal(
      resolveMembershipTier({
        membership: activeMembership,
        profile: {},
      }),
      "blackcard",
    );
  });

  it("grants blackcard from admin override without stripe", () => {
    assert.equal(
      resolveMembershipTier({
        membership: null,
        profile: {
          is_premium: true,
          premium_tier: "blackcard",
        },
      }),
      "blackcard",
    );
  });

  it("returns free when subscription is canceled and no override", () => {
    assert.equal(
      resolveMembershipTier({
        membership: {
          status: "canceled",
          plan_type: "monthly",
          current_period_end: new Date(Date.now() - 86_400_000).toISOString(),
        },
        profile: {},
      }),
      "free",
    );
  });

  it("keeps founding badge independent of stripe cancellation", () => {
    assert.equal(
      resolveMembershipTier({
        membership: {
          status: "canceled",
          plan_type: "monthly",
          current_period_end: new Date(Date.now() - 86_400_000).toISOString(),
        },
        profile: { is_founding_blackcard: true },
      }),
      "founding",
    );
  });

  it("uses blackcard_public for public profile visibility", () => {
    assert.equal(
      resolveMembershipTier({
        membership: null,
        profile: { membership_tier: "free" },
        blackcardPublic: true,
      }),
      "blackcard",
    );
  });
});

describe("membershipTierLabel", () => {
  it("returns the expected badge labels", () => {
    assert.equal(membershipTierLabel("founder"), "Founder Blackcard");
    assert.equal(membershipTierLabel("founding"), "Founding Blackcard Member");
    assert.equal(membershipTierLabel("blackcard"), "Blackcard Member");
    assert.equal(membershipTierLabel("free"), "Free Member");
  });
});
