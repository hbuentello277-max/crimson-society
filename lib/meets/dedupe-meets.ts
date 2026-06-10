/** Keeps the first occurrence of each meet id when merging or rendering lists. */
export function dedupeMeetsById<T extends { id: string }>(meets: T[]): T[] {
  const seen = new Set<string>();

  return meets.filter((meet) => {
    if (seen.has(meet.id)) return false;
    seen.add(meet.id);
    return true;
  });
}
