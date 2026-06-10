export const DM_PLAYBACK_SPEEDS = [1, 1.5, 2] as const;

export type DmPlaybackSpeed = (typeof DM_PLAYBACK_SPEEDS)[number];

export function nextDmPlaybackSpeed(current: DmPlaybackSpeed): DmPlaybackSpeed {
  const index = DM_PLAYBACK_SPEEDS.indexOf(current);
  return DM_PLAYBACK_SPEEDS[(index + 1) % DM_PLAYBACK_SPEEDS.length];
}
