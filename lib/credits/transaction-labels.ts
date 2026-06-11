const TYPE_LABELS: Record<string, string> = {
  meet_attended: "Meet Attended",
  meet_hosted: "Meet Hosted",
  meet_cohost: "Meet Co-Hosted",
  referral_signup: "Referral Signup",
  referral_blackcard: "Referral Blackcard",
  rider_onboarding: "New Rider Onboarding",
  admin_adjustment: "Admin Adjustment",
  adjustment: "Adjustment",
  reward_redemption: "Reward Redemption",
  reward_redemption_refund: "Reward Redemption Refund",
};

export function formatCreditTransactionLabel(
  transactionType: string,
  _amount: number,
  reason?: string | null,
): string {
  const knownLabel = TYPE_LABELS[transactionType];
  if (knownLabel) {
    return knownLabel;
  }

  const trimmedReason = reason?.trim();
  if (trimmedReason) {
    return trimmedReason;
  }

  return humanizeType(transactionType);
}

export function formatCreditTransactionLine(
  transactionType: string,
  amount: number,
  reason?: string | null,
): string {
  const sign = amount > 0 ? "+" : "";
  const label = formatCreditTransactionLabel(transactionType, amount, reason);
  return `${sign}${amount} ${label}`;
}

function humanizeType(transactionType: string) {
  return transactionType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
