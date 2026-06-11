export const ACHIEVEMENT_TRANSACTION_TYPE = "achievement_milestone";

export function isAchievementMilestoneTransaction(transactionType: string) {
  return transactionType === ACHIEVEMENT_TRANSACTION_TYPE;
}

export function formatAchievementMilestoneDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatAchievementMilestoneLine(amount: number, reason: string | null, createdAt: string) {
  const description = reason?.trim() || "Achievement milestone earned";
  const date = formatAchievementMilestoneDate(createdAt);
  return {
    amountLine: `+${amount} Crimson Credits`,
    detailLine: `${description.replace(/\.$/, "")}. ${date}`,
  };
}
