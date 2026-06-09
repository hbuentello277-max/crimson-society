export type FounderNameSource = {
  display_name?: string | null;
  username?: string | null;
};

export function resolveFounderName(source: FounderNameSource): string {
  const displayName = source.display_name?.trim();
  if (displayName) {
    return displayName;
  }

  const username = source.username?.trim();
  if (username) {
    return username;
  }

  return "Founder";
}

export function timeOfDayGreeting(date: Date): "Good morning" | "Good afternoon" | "Good evening" {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }

  if (hour >= 12 && hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function buildFounderGreeting(
  source: FounderNameSource,
  date: Date = new Date(),
): string {
  return `${timeOfDayGreeting(date)}, ${resolveFounderName(source)}.`;
}
