import type { Place } from "../types";
import { digitransitGeocodingHeaders } from "./client";

const GEO_URL = "https://api.digitransit.fi/geocoding/v1/search";

const HELSINKI_FOCUS = { lat: 60.1699, lon: 24.9384 };
const HELSINKI_BBOX = {
  min_lat: 59.9,
  max_lat: 60.45,
  min_lon: 24.3,
  max_lon: 25.5,
};

export async function geocodePlace(text: string, limit = 5): Promise<Place[]> {
  const params = new URLSearchParams({
    text,
    size: String(limit),
    lang: "en",
    "focus.point.lat": String(HELSINKI_FOCUS.lat),
    "focus.point.lon": String(HELSINKI_FOCUS.lon),
    "boundary.rect.min_lat": String(HELSINKI_BBOX.min_lat),
    "boundary.rect.max_lat": String(HELSINKI_BBOX.max_lat),
    "boundary.rect.min_lon": String(HELSINKI_BBOX.min_lon),
    "boundary.rect.max_lon": String(HELSINKI_BBOX.max_lon),
    layers: "venue,address,stop",
  });

  const key = process.env.DIGITRANSIT_API_KEY;
  if (key) params.set("digitransit-subscription-key", key);

  const res = await fetch(`${GEO_URL}?${params}`, {
    headers: digitransitGeocodingHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status})`);
  }

  const json = (await res.json()) as {
    features?: {
      properties?: {
        name?: string;
        label?: string;
        layer?: string;
      };
      geometry?: { coordinates?: [number, number] };
    }[];
  };

  return (json.features ?? [])
    .map((f, i): Place | null => {
      const coords = f.geometry?.coordinates;
      if (!coords) return null;
      const [lon, lat] = coords;
      const name = f.properties?.label ?? f.properties?.name ?? text;
      return {
        id: `geo-${i}`,
        name,
        lat,
        lon,
        category: f.properties?.layer,
      };
    })
    .filter((p): p is Place => p !== null);
}
