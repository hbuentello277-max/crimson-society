export type PlaceSearchResult = {
  placeId: number;
  label: string;
  subtitle: string;
  fullAddress: string;
  lat: number;
  lng: number;
  category: string | null;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  postcode?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  name?: string;
  address?: NominatimAddress;
};

function cityFromAddress(address?: NominatimAddress) {
  return address?.city || address?.town || address?.village || address?.hamlet || address?.county || null;
}

export function parseNominatimResult(raw: unknown): PlaceSearchResult | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as NominatimResult;
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const address = item.address;
  const city = cityFromAddress(address);
  const state = address?.state?.trim() || null;
  const label =
    item.name?.trim() ||
    [address?.house_number, address?.road].filter(Boolean).join(" ").trim() ||
    item.display_name.split(",")[0]?.trim() ||
    item.display_name;

  const subtitle = [city, state].filter(Boolean).join(", ") || item.display_name;
  const category = item.type || item.class || null;

  return {
    placeId: item.place_id,
    label,
    subtitle,
    fullAddress: item.display_name,
    lat,
    lng,
    category,
  };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "us");

  const response = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Location search failed");
  }

  const data = (await response.json()) as unknown[];
  return data
    .map((item) => parseNominatimResult(item))
    .filter((item): item is PlaceSearchResult => !!item);
}
