import type { Place, PlaceCategory } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const CATEGORY_TAGS: Record<PlaceCategory, string[]> = {
  museum: ['nwr["tourism"="museum"]'],
  sight: ['nwr["tourism"~"attraction|viewpoint"]', 'nwr["historic"]'],
  restaurant: ['nwr["amenity"="restaurant"]'],
  bar: ['nwr["amenity"~"bar|pub"]'],
  cafe: ['nwr["amenity"="cafe"]'],
  historic: ['nwr["historic"]'],
  any: [
    'nwr["tourism"~"museum|attraction|viewpoint"]',
    'nwr["historic"]',
    'nwr["amenity"~"restaurant|bar|cafe"]',
  ],
};

const cache = new Map<string, { at: number; places: Place[] }>();
const CACHE_MS = 15 * 60 * 1000;

function buildQuery(categories: PlaceCategory[], limit: number): string {
  const tags = new Set<string>();
  for (const cat of categories) {
    for (const t of CATEGORY_TAGS[cat]) tags.add(t);
  }
  const clauses = [...tags].join(";\n  ");
  return `
[out:json][timeout:25];
area["name"="Helsinki"]["admin_level"="8"]->.helsinki;
(
  ${clauses};
);
out center ${limit};
`.trim();
}

function elementToPlace(el: {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}): Place | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const name = el.tags?.name ?? el.tags?.["name:en"] ?? el.tags?.["name:fi"];
  if (!name) return null;
  return {
    id: `${el.type}/${el.id}`,
    name,
    lat,
    lon,
    category: el.tags?.tourism ?? el.tags?.amenity ?? el.tags?.historic,
    tags: el.tags,
  };
}

export async function searchPlaces(
  categories: PlaceCategory[] = ["any"],
  limit = 30,
): Promise<Place[]> {
  const key = `${categories.sort().join(",")}:${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.places;

  const query = buildQuery(categories, limit);
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Overpass failed (${res.status})`);
  }

  const json = (await res.json()) as { elements?: Parameters<typeof elementToPlace>[0][] };
  const places = (json.elements ?? [])
    .map(elementToPlace)
    .filter((p): p is Place => p !== null)
    .slice(0, limit);

  cache.set(key, { at: Date.now(), places });
  return places;
}
