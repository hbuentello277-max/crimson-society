export const PROFILE_MENU_FROM = "profile-menu";

export const PROFILE_MENU_OPEN_PARAM = "menu";
export const PROFILE_MENU_OPEN_VALUE = "1";

export function profileMenuOpenPath() {
  return `/profile?${PROFILE_MENU_OPEN_PARAM}=${PROFILE_MENU_OPEN_VALUE}`;
}

/** Append `from=profile-menu` for destinations opened from the profile ⋯ menu. */
export function hrefWithProfileMenuFrom(href: string) {
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf("?");
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const params = new URLSearchParams(
    queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : undefined,
  );
  params.set("from", PROFILE_MENU_FROM);
  const query = params.toString();
  return `${path}?${query}${hash}`;
}

export function isOpenedFromProfileMenu(from: string | null | undefined) {
  return from === PROFILE_MENU_FROM;
}

export function profileMenuBackHref(
  from: string | null | undefined,
  fallbackHref = "/profile",
) {
  return isOpenedFromProfileMenu(from) ? profileMenuOpenPath() : fallbackHref;
}
