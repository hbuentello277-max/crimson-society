export const MEMBERSHIP_UPDATED_EVENT = "crimson-membership-updated";

export function dispatchMembershipUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MEMBERSHIP_UPDATED_EVENT));
}
