export type MapsNavigationTarget = {
  lat: number;
  lng: number;
  label?: string | null;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function buildAppleMapsDirectionsUrl(target: MapsNavigationTarget) {
  const params = new URLSearchParams({
    daddr: `${target.lat},${target.lng}`,
    dirflg: "d",
  });
  if (target.label?.trim()) {
    params.set("q", target.label.trim());
  }
  return `https://maps.apple.com/?${params.toString()}`;
}

export function buildGoogleMapsDirectionsUrl(target: MapsNavigationTarget) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${target.lat},${target.lng}`,
    travelmode: "driving",
  });
  if (target.label?.trim()) {
    params.set("destination_place_id", target.label.trim());
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildMapsDirectionsUrl(target: MapsNavigationTarget) {
  if (isIosDevice()) {
    return buildAppleMapsDirectionsUrl(target);
  }
  if (isAndroidDevice()) {
    return buildGoogleMapsDirectionsUrl(target);
  }
  return buildGoogleMapsDirectionsUrl(target);
}

export function openMapsNavigation(target: MapsNavigationTarget) {
  if (typeof window === "undefined") return;
  const url = buildMapsDirectionsUrl(target);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function hasMapsNavigationTarget(
  target: Partial<MapsNavigationTarget> | null | undefined,
): target is MapsNavigationTarget {
  return (
    !!target &&
    Number.isFinite(target.lat) &&
    Number.isFinite(target.lng)
  );
}
