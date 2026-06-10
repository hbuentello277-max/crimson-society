export type MeetHostDisplayLines = {
  hostedBy: string;
  coHostLine: string | null;
};

export function formatMeetHostDisplayLines(
  primaryHostDisplayName: string,
  coHostDisplayName?: string | null,
): MeetHostDisplayLines {
  const hostedBy = `Hosted by ${primaryHostDisplayName.trim() || "Crimson Member"}`;
  const coHost = coHostDisplayName?.trim();

  return {
    hostedBy,
    coHostLine: coHost ? `Co-host: ${coHost}` : null,
  };
}
