export function getDashboardProfileHref(handle: string) {
  const username = handle.replace(/^@+/, "").trim();
  if (!username || username === "unknown") return null;
  return `/profile/${username}`;
}
