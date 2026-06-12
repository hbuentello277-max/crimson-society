export type RiderSosMotorcycleSummary = {
  year: string | null;
  name: string | null;
  finish: string | null;
  label: string | null;
};

export function formatRiderSosBikeInfo(
  profile: { bike_type: string | null },
  motorcycles: RiderSosMotorcycleSummary[],
): string {
  const primary = motorcycles[0];
  if (primary) {
    const core = [primary.year?.trim(), primary.name?.trim()].filter(Boolean).join(" ").trim();
    if (core) {
      const finish = primary.finish?.trim();
      return finish ? `${core} (${finish})` : core;
    }
  }

  return profile.bike_type?.trim() || "";
}
