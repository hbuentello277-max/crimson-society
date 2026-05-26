const MPS_TO_MPH = 2.2369362921;

export function metersPerSecondToMph(speed: number | null) {
  if (speed === null || !Number.isFinite(speed) || speed < 0) return 0;
  return speed * MPS_TO_MPH;
}

export function getAverageSpeedMph(distanceMiles: number, durationMs: number) {
  const hours = durationMs / 1000 / 60 / 60;
  if (hours <= 0) return 0;
  return distanceMiles / hours;
}

export function getSegmentSpeedMph(distanceMiles: number, fromTimestamp: number, toTimestamp: number) {
  return getAverageSpeedMph(distanceMiles, toTimestamp - fromTimestamp);
}
