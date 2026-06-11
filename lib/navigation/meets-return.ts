export const MEETS_RETURN_QUERY = "from";
export const MEETS_RETURN_VALUE = "meets";
export const DASHBOARD_RETURN_VALUE = "dashboard";

export type MeetDetailSource = "meets" | "dashboard";

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

export function isDashboardMeetReturnContext(searchParams: URLSearchParams | string) {
  const params =
    typeof searchParams === "string" ? new URLSearchParams(searchParams) : searchParams;
  return params.get(MEETS_RETURN_QUERY) === DASHBOARD_RETURN_VALUE;
}

export function getMeetDetailSource(
  searchParams: URLSearchParams | string,
): MeetDetailSource | null {
  const params =
    typeof searchParams === "string" ? new URLSearchParams(searchParams) : searchParams;
  const from = params.get(MEETS_RETURN_QUERY);

  if (from === DASHBOARD_RETURN_VALUE) return "dashboard";
  if (from === MEETS_RETURN_VALUE) return "meets";
  return null;
}

export function meetDetailHref(meetId: string, source?: MeetDetailSource) {
  const params = new URLSearchParams({ meet: meetId });
  if (source) {
    params.set(MEETS_RETURN_QUERY, source);
  }
  return `/meets?${params.toString()}`;
}

export function meetDetailCloseHref(source: MeetDetailSource | null) {
  return source === "dashboard" ? "/dashboard" : "/meets";
}
