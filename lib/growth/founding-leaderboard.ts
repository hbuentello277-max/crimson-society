export const FOUNDING_LEADERBOARD_TOP_N = 15;

export const FOUNDING_LEADERBOARD_SCORING = {
  profileComplete: 100,
  attendMeet: 10,
  hostMeet: 20,
  referralSignup: 25,
  referralBlackcard: 50,
} as const;

export type FoundingLeaderboardEntry = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  creditsBalance: number;
  profilePoints: number;
  attendPoints: number;
  hostPoints: number;
  referralSignupPoints: number;
  referralBlackcardPoints: number;
  isCurrentUser: boolean;
  inTop15: boolean;
};

export type FoundingLeaderboardCurrentUser = {
  rank: number | null;
  points: number;
  inTop15: boolean;
  profilePoints: number;
  attendPoints: number;
  hostPoints: number;
  referralSignupPoints: number;
  referralBlackcardPoints: number;
};

export type FoundingLeaderboardData = {
  entries: FoundingLeaderboardEntry[];
  currentUser: FoundingLeaderboardCurrentUser;
  topN: number;
  cutoffPoints: number;
  scoring: typeof FOUNDING_LEADERBOARD_SCORING;
};

function parseEntry(raw: Record<string, unknown>): FoundingLeaderboardEntry {
  return {
    rank: typeof raw.rank === "number" ? raw.rank : 0,
    userId: typeof raw.user_id === "string" ? raw.user_id : "",
    username: typeof raw.username === "string" ? raw.username : null,
    displayName: typeof raw.display_name === "string" ? raw.display_name : null,
    avatarUrl: typeof raw.avatar_url === "string" ? raw.avatar_url : null,
    points: typeof raw.points === "number" ? raw.points : 0,
    creditsBalance: typeof raw.credits_balance === "number" ? raw.credits_balance : 0,
    profilePoints: typeof raw.profile_points === "number" ? raw.profile_points : 0,
    attendPoints: typeof raw.attend_points === "number" ? raw.attend_points : 0,
    hostPoints: typeof raw.host_points === "number" ? raw.host_points : 0,
    referralSignupPoints:
      typeof raw.referral_signup_points === "number" ? raw.referral_signup_points : 0,
    referralBlackcardPoints:
      typeof raw.referral_blackcard_points === "number" ? raw.referral_blackcard_points : 0,
    isCurrentUser: raw.is_current_user === true,
    inTop15: raw.in_top_15 === true,
  };
}

export function parseFoundingLeaderboardPayload(
  payload: Record<string, unknown> | null | undefined,
): FoundingLeaderboardData {
  const entriesRaw = Array.isArray(payload?.entries) ? payload.entries : [];
  const currentRaw =
    payload?.current_user && typeof payload.current_user === "object"
      ? (payload.current_user as Record<string, unknown>)
      : {};

  return {
    entries: entriesRaw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(parseEntry),
    currentUser: {
      rank: typeof currentRaw.rank === "number" ? currentRaw.rank : null,
      points: typeof currentRaw.points === "number" ? currentRaw.points : 0,
      inTop15: currentRaw.in_top_15 === true,
      profilePoints:
        typeof currentRaw.profile_points === "number" ? currentRaw.profile_points : 0,
      attendPoints: typeof currentRaw.attend_points === "number" ? currentRaw.attend_points : 0,
      hostPoints: typeof currentRaw.host_points === "number" ? currentRaw.host_points : 0,
      referralSignupPoints:
        typeof currentRaw.referral_signup_points === "number"
          ? currentRaw.referral_signup_points
          : 0,
      referralBlackcardPoints:
        typeof currentRaw.referral_blackcard_points === "number"
          ? currentRaw.referral_blackcard_points
          : 0,
    },
    topN: typeof payload?.top_n === "number" ? payload.top_n : FOUNDING_LEADERBOARD_TOP_N,
    cutoffPoints: typeof payload?.cutoff_points === "number" ? payload.cutoff_points : 0,
    scoring: FOUNDING_LEADERBOARD_SCORING,
  };
}

import { formatRiderIdentity } from "@/lib/rider-identity";

export function foundingLeaderboardDisplayName(entry: {
  displayName: string | null;
  username: string | null;
}) {
  return formatRiderIdentity(
    { username: entry.username, display_name: entry.displayName },
    { fallback: "Crimson Rider" },
  );
}

/** Leaderboard race score shown in rows and rider preview sheets. */
export function foundingLeaderboardRowPoints(entry: Pick<FoundingLeaderboardEntry, "points">) {
  return typeof entry.points === "number" && Number.isFinite(entry.points) ? entry.points : 0;
}

export function formatFoundingLeaderboardPoints(points: number) {
  const value = Number.isFinite(points) ? points : 0;
  return `${value.toLocaleString("en-US")} points`;
}
