const DEFAULT_PUBLIC_ORIGIN = "https://www.crimson-society.com";

export function resolveMeetShareOrigin(origin?: string | null) {
  const trimmed = origin?.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

export function buildMeetPublicUrl(meetId: string, origin?: string | null) {
  return `${resolveMeetShareOrigin(origin)}/meets/${encodeURIComponent(meetId)}`;
}

export function buildMeetShareText(meetName: string, hostName: string, url: string) {
  return `${meetName}\n\nHosted by ${hostName}\n\nJoin us on Crimson Society.\n\n${url}`;
}
