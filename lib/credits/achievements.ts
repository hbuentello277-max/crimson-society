export const ACHIEVEMENT_TRANSACTION_TYPE = "achievement_milestone";

export type AchievementMilestoneDefinition = {
  label: string;
  credits: number;
};

export type AchievementMilestoneGroup = {
  title: string;
  milestones: AchievementMilestoneDefinition[];
};

export const ACHIEVEMENT_MILESTONE_GROUPS: AchievementMilestoneGroup[] = [
  {
    title: "Meet Attendance",
    milestones: [
      { label: "Attend 10 Meets", credits: 50 },
      { label: "Attend 25 Meets", credits: 100 },
      { label: "Attend 50 Meets", credits: 250 },
      { label: "Attend 100 Meets", credits: 500 },
    ],
  },
  {
    title: "Meet Hosting",
    milestones: [
      { label: "Host 5 Meets", credits: 50 },
      { label: "Host 15 Meets", credits: 150 },
      { label: "Host 30 Meets", credits: 300 },
      { label: "Host 50 Meets", credits: 500 },
    ],
  },
  {
    title: "Referrals",
    milestones: [
      { label: "Refer 3 Riders", credits: 75 },
      { label: "Refer 10 Riders", credits: 200 },
      { label: "Refer 25 Riders", credits: 500 },
      { label: "Refer 50 Riders", credits: 1000 },
    ],
  },
  {
    title: "Blackcard Conversions",
    milestones: [
      { label: "3 Blackcard Conversions", credits: 150 },
      { label: "10 Blackcard Conversions", credits: 500 },
      { label: "25 Blackcard Conversions", credits: 1500 },
    ],
  },
];

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
