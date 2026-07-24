import type { Place, PlaceCategory } from "../types";

// Overpass is community-run and frequently rate-limits (429) or times out (504).
// Try several mirrors in order before giving up.
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];
// Kept short on purpose: this runs inside the agent's tool loop, so a slow
// mirror stalls the whole plan. Fail fast and move to the next mirror (or the
// stale cache) rather than letting one call hang the run for a minute.
const REQUEST_TIMEOUT_MS = 8_000;

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

  // Try each mirror; on total failure fall back to a stale cache entry so the
  // agent still gets usable data instead of an exception.
  let lastError = "";
  let json: { elements?: Parameters<typeof elementToPlace>[0][] } | null = null;

  for (const url of OVERPASS_URLS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        lastError = `${new URL(url).host} returned ${res.status}`;
        continue;
      }
      json = (await res.json()) as { elements?: Parameters<typeof elementToPlace>[0][] };
      break;
    } catch (err) {
      lastError =
        err instanceof Error && err.name === "AbortError"
          ? `${new URL(url).host} timed out`
          : `${new URL(url).host}: ${err instanceof Error ? err.message : "request failed"}`;
    } finally {
      clearTimeout(timer);
    }
  }

  if (!json) {
    if (hit) return hit.places; // stale but useful
    throw new Error(`OpenStreetMap place search is unavailable right now (${lastError}).`);
  }
  const places = (json.elements ?? [])
    .map(elementToPlace)
    .filter((p): p is Place => p !== null)
    .slice(0, limit);

  cache.set(key, { at: Date.now(), places });
  return places;
}
