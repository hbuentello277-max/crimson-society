import { isProfileSetupComplete } from "@/lib/profile";

export const RIDER_ONBOARDING_REWARD_CREDITS = 100;
export const RIDER_ONBOARDING_REFRESH_EVENT = "crimson:rider-onboarding-refresh";

export type RiderMotorcycleInput = {
  name?: string | null;
  year?: string | null;
};

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
  motorcycles?: RiderMotorcycleInput[];
  motorcycleCount?: number;
  creditsAwarded?: boolean;
  rewardAmount?: number;
};

export function isRideComplete(motorcycle: RiderMotorcycleInput) {
  return Boolean(motorcycle.name?.trim() && motorcycle.year?.trim());
}

export function hasCompleteRide(motorcycles: RiderMotorcycleInput[]) {
  return motorcycles.some(isRideComplete);
}

export function buildRiderOnboardingStatus(input: RiderOnboardingInput): RiderOnboardingStatus {
  const profileComplete = isProfileSetupComplete(input.profile);
  const rideAdded = input.motorcycles
    ? hasCompleteRide(input.motorcycles)
    : (input.motorcycleCount ?? 0) > 0;
  const progressPercent = (profileComplete ? 50 : 0) + (rideAdded ? 50 : 0);

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

export function dispatchRiderOnboardingRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RIDER_ONBOARDING_REFRESH_EVENT));
}
