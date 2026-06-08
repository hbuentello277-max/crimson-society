export function reelRenderPaths(originalPath: string) {
  const dir = originalPath.replace(/\/[^/]+$/, "");
  return {
    thumbnailPath: `${dir}/thumbnail.jpg`,
    playbackPath: `${dir}/playback.mp4`,
  };
}
