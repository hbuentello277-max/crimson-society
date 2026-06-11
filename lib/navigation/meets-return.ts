export const MEETS_RETURN_QUERY = "from";
export const MEETS_RETURN_VALUE = "meets";

export function blackcardLeaderboardHref(fromMeets = true) {
  return fromMeets
    ? `/profile/blackcard-leaderboard?${MEETS_RETURN_QUERY}=${MEETS_RETURN_VALUE}`
    : "/profile/blackcard-leaderboard";
}

export function isMeetsReturnContext(searchParams: URLSearchParams | string) {
  const params =
    typeof searchParams === "string" ? new URLSearchParams(searchParams) : searchParams;
  return params.get(MEETS_RETURN_QUERY) === MEETS_RETURN_VALUE;
}
