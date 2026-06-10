export const CREDITS_HISTORY_PATH = "/profile/credits/history";

export type MeetCreditRewardRole = "attend" | "host" | "cohost";

export function meetCreditNotificationGroupKey(userId: string, idempotencyKey: string) {
  return `crimson_credits_reward:${userId}:${idempotencyKey}`;
}

export function buildMeetCreditNotification(input: {
  role: MeetCreditRewardRole;
  amount: number;
  meetName: string;
}) {
  const meetLabel = input.meetName.trim() || "your meet";

  if (input.role === "attend") {
    return {
      title: "Crimson Credits earned",
      body: `You earned ${input.amount} Crimson Credits for attending ${meetLabel}.`,
      reason: "meet_attended" as const,
    };
  }

  if (input.role === "cohost") {
    return {
      title: "Crimson Credits earned",
      body: `You earned ${input.amount} Crimson Credits for co-hosting ${meetLabel}.`,
      reason: "meet_cohost" as const,
    };
  }

  return {
    title: "Crimson Credits earned",
    body: `You earned ${input.amount} Crimson Credits for hosting ${meetLabel}.`,
    reason: "meet_hosted" as const,
  };
}

export function shouldEmitMeetCreditNotification(awardResult: {
  awarded?: number;
  duplicate?: boolean;
}) {
  return (awardResult.awarded ?? 0) > 0 && awardResult.duplicate !== true;
}
