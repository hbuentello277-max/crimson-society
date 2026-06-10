/** Native-style badge label: 1–9 exact, 10–99 → 9+, 100+ → 99+. */
export function formatNavBadgeCount(count: number): string {
  if (count > 99) return "99+";
  if (count > 9) return "9+";
  return String(count);
}
