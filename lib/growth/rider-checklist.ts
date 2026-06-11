import { isProfileSetupComplete } from "@/lib/profile";

export const RIDER_ONBOARDING_REWARD_CREDITS = 100;

export type RiderOnboardingStatus = {
  profileComplete: boolean;
  rideAdded: boolean;
  progressPercent: number;
  onboardingComplete: boolean;
  creditsAwarded: boolean;
  rewardAmount: number;
};

export type RiderOnboardingInput = {
  profile: { username?: string | null; display_name?: string | null } | null;
  motorcycleCount: number;
  creditsAwarded?: boolean;
  rewardAmount?: number;
};

export function buildRiderOnboardingStatus(input: RiderOnboardingInput): RiderOnboardingStatus {
  const profileComplete = isProfileSetupComplete(input.profile);
  const rideAdded = input.motorcycleCount > 0;
  const progressPercent =
    (profileComplete ? 50 : 0) + (rideAdded ? 50 : 0);

  return {
    profileComplete,
    rideAdded,
    progressPercent,
    onboardingComplete: profileComplete && rideAdded,
    creditsAwarded: input.creditsAwarded ?? false,
    rewardAmount: input.rewardAmount ?? RIDER_ONBOARDING_REWARD_CREDITS,
  };
}

export function parseRiderOnboardingRpcPayload(
  payload: Record<string, unknown> | null | undefined,
): RiderOnboardingStatus {
  return {
    profileComplete: payload?.profile_complete === true,
    rideAdded: payload?.ride_added === true,
    progressPercent:
      typeof payload?.progress_percent === "number" ? payload.progress_percent : 0,
    onboardingComplete: payload?.onboarding_complete === true,
    creditsAwarded: payload?.credits_awarded === true,
    rewardAmount:
      typeof payload?.reward_amount === "number"
        ? payload.reward_amount
        : RIDER_ONBOARDING_REWARD_CREDITS,
  };
}

export function shouldShowRiderChecklist(status: RiderOnboardingStatus) {
  return !status.creditsAwarded;
}
