import polyline from "@mapbox/polyline";
import { computeFare } from "./fare";
import { inHslZones } from "./network";
import type {
  JourneyLeg,
  JourneyResult,
  JourneySegment,
  Mode,
  StopLite,
  TransportPreference,
} from "./types";
import { loadWeather, transportPreference } from "./weather";

export const HSL_ROUTING_URL = "https://api.digitransit.fi/routing/v2/hsl/gtfs/v1";

export function digitransitKey(): string | undefined {
  return (
    process.env.DIGITRANSIT_API_KEY ||
    process.env.DIGITRANSIT_PRIMARY_KEY ||
    process.env.DIGITRANSIT_SECONDARY_KEY ||
    undefined
  );
}

export function digitransitHeaders(): HeadersInit {
  const key = digitransitKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (key) headers["digitransit-subscription-key"] = key;
  return headers;
}

export async function hslGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(HSL_ROUTING_URL, {
    method: "POST",
    headers: digitransitHeaders(),
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Digitransit routing failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("Digitransit returned no data");
  return json.data;
}

const SEARCH_STOPS_QUERY = `
query SearchStops($name: String!) {
  stops(name: $name) {
    gtfsId
    name
    code
    lat
    lon
    zoneId
    vehicleMode
    locationType
  }
}
`;

interface RawStop {
  gtfsId?: string;
  name?: string;
  code?: string | null;
  lat?: number;
  lon?: number;
  zoneId?: string | null;
  vehicleMode?: string | null;
  locationType?: string | null;
}

function isSelectableStop(stop: StopLite): boolean {
  if (inHslZones(stop)) return true;
  return stop.lat >= 59.9 && stop.lat <= 60.45 && stop.lon >= 24.3 && stop.lon <= 25.5;
}

function toStopLite(s: RawStop): StopLite | null {
  if (!s.gtfsId || s.lat == null || s.lon == null || !s.name) return null;
  const zone = s.zoneId?.trim().toUpperCase() ?? null;
  return {
    id: s.gtfsId,
    name: s.name,
    code: s.code ?? null,
    zone,
    mode: s.vehicleMode ?? null,
    lat: s.lat,
    lon: s.lon,
  };
}

export async function searchDigitransitStops(q: string, limit = 8): Promise<StopLite[]> {
  const needle = q.trim();
  if (needle.length < 2) return [];

  const data = await hslGraphql<{ stops?: RawStop[] }>(SEARCH_STOPS_QUERY, { name: needle });
  const seen = new Set<string>();
  const out: StopLite[] = [];

  for (const raw of data.stops ?? []) {
    const stop = toStopLite(raw);
    if (!stop || !isSelectableStop(stop)) continue;
    const key = `${stop.name.toLowerCase()}|${stop.lat.toFixed(4)}|${stop.lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(stop);
    if (out.length >= limit) break;
  }

  return out.sort((a, b) => {
    const aPrefix = a.name.toLowerCase().startsWith(needle.toLowerCase()) ? 0 : 1;
    const bPrefix = b.name.toLowerCase().startsWith(needle.toLowerCase()) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return a.name.localeCompare(b.name);
  });
}

const PLAN_QUERY = `
query PlanHsl(
  $originLat: CoordinateValue!
  $originLon: CoordinateValue!
  $destLat: CoordinateValue!
  $destLon: CoordinateValue!
  $departure: OffsetDateTime
  $modes: PlanModesInput
  $preferences: PlanPreferencesInput
) {
  planConnection(
    origin: { location: { coordinate: { latitude: $originLat, longitude: $originLon } } }
    destination: { location: { coordinate: { latitude: $destLat, longitude: $destLon } } }
    first: 1
    dateTime: { earliestDeparture: $departure }
    modes: $modes
    preferences: $preferences
  ) {
    edges {
      node {
        duration
        walkDistance
        legs {
          mode
          duration
          distance
          from {
            name
            lat
            lon
            stop { gtfsId name zoneId }
          }
          to {
            name
            lat
            lon
            stop { gtfsId name zoneId }
          }
          route { shortName longName color mode }
          trip { routeShortName tripHeadsign }
          legGeometry { points }
        }
      }
    }
  }
}
`;

interface RawPlace {
  name?: string;
  lat?: number;
  lon?: number;
  stop?: { gtfsId?: string; name?: string; zoneId?: string | null };
}

interface RawLeg {
  mode?: string;
  duration?: number;
  distance?: number;
  from?: RawPlace;
  to?: RawPlace;
  route?: { shortName?: string; longName?: string; color?: string; mode?: string };
  trip?: { routeShortName?: string; tripHeadsign?: string };
  legGeometry?: { points?: string };
}

function decodeLegPath(encoded: string): [number, number][] {
  if (!encoded) return [];
  return polyline.decode(encoded) as [number, number][];
}

function placeToStopLite(p: RawPlace | undefined, fallbackId: string): StopLite {
  const stop = p?.stop;
  return {
    id: stop?.gtfsId ?? fallbackId,
    name: stop?.name ?? p?.name ?? "Stop",
    code: null,
    zone: stop?.zoneId?.trim().toUpperCase() ?? null,
    mode: null,
    lat: p?.lat ?? 0,
    lon: p?.lon ?? 0,
  };
}

function normalizeMode(mode: string | undefined): Mode {
  const m = (mode ?? "WALK").toUpperCase();
  if (m === "SUBWAY" || m === "METRO") return "SUBWAY";
  if (m === "RAIL" || m === "TRAIN") return "RAIL";
  if (m === "TRAM") return "TRAM";
  if (m === "BUS") return "BUS";
  if (m === "FERRY") return "FERRY";
  if (m === "WALK") return "WALK";
  return "BUS";
}

function buildModes(preference: TransportPreference) {
  const transit = [
    { mode: "BUS" },
    { mode: "TRAM" },
    { mode: "RAIL" },
    { mode: "SUBWAY" },
    ...(preference.rain ? [] : [{ mode: "FERRY" }]),
  ];
  return { transit: { transit } };
}

function buildPreferences(preference: TransportPreference) {
  // Digitransit routing API v2 nests walk/transfer prefs under street/transit.
  return {
    street: {
      walk: {
        reluctance: preference.rain ? 4.5 : 1.4,
      },
    },
    transit: {
      transfer: {
        cost: preference.rain ? 120 : 0,
      },
    },
  };
}

async function planSegment(
  from: StopLite,
  to: StopLite,
  preference: TransportPreference,
  departureIso: string,
): Promise<RawLeg[]> {
  const data = await hslGraphql<{
    planConnection?: { edges?: { node?: { legs?: RawLeg[] } }[] };
  }>(PLAN_QUERY, {
    originLat: from.lat,
    originLon: from.lon,
    destLat: to.lat,
    destLon: to.lon,
    departure: departureIso,
    modes: buildModes(preference),
    preferences: buildPreferences(preference),
  });

  const legs = data.planConnection?.edges?.[0]?.node?.legs ?? [];
  if (!legs.length) {
    throw new Error(`No HSL route found between ${from.name} and ${to.name}.`);
  }
  return legs;
}

function rawLegToJourneyLeg(leg: RawLeg, segIndex: number, legIndex: number): JourneyLeg {
  const mode = normalizeMode(leg.mode ?? leg.route?.mode);
  const isWalk = mode === "WALK";
  const path = decodeLegPath(leg.legGeometry?.points ?? "");
  const from = placeToStopLite(leg.from, `seg${segIndex}-leg${legIndex}-from`);
  const to = placeToStopLite(leg.to, `seg${segIndex}-leg${legIndex}-to`);

  if (path.length < 2 && from.lat && to.lat) {
    path.push([from.lat, from.lon], [to.lat, to.lon]);
  }

  const routeShortName = leg.trip?.routeShortName ?? leg.route?.shortName ?? null;
  const color = leg.route?.color ? `#${leg.route.color.replace(/^#/, "")}` : null;

  return {
    kind: isWalk ? "walk" : "ride",
    mode,
    routeShortName,
    routeLongName: leg.route?.longName ?? null,
    color,
    from,
    to,
    walkMeters: isWalk ? leg.distance : undefined,
    seconds: leg.duration ?? 0,
    path,
  };
}

export async function planDigitransitJourney(destinations: StopLite[]): Promise<JourneyResult> {
  const weather = loadWeather();
  const preference = transportPreference(weather);

  if (destinations.length < 2) {
    return {
      ok: false,
      error: "Add at least two HSL destinations.",
      destinations,
      segments: [],
      totalSeconds: 0,
      weather,
      preference,
    };
  }

  const segments: JourneySegment[] = [];
  let totalSeconds = 0;
  let minLat = 90;
  let minLon = 180;
  let maxLat = -90;
  let maxLon = -180;
  const extend = (lat: number, lon: number) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  };

  let departure = new Date().toISOString();

  for (let i = 0; i < destinations.length - 1; i++) {
    const from = destinations[i];
    const to = destinations[i + 1];
    try {
      const rawLegs = await planSegment(from, to, preference, departure);
      const legs = rawLegs.map((leg, li) => rawLegToJourneyLeg(leg, i, li));
      const secs = legs.reduce((a, l) => a + l.seconds, 0);
      totalSeconds += secs;

      for (const l of legs) {
        for (const [la, lo] of l.path) extend(la, lo);
      }

      segments.push({
        fromName: from.name,
        toName: to.name,
        legs,
        seconds: secs,
      });

      departure = new Date(Date.now() + totalSeconds * 1000).toISOString();
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : `No route between ${from.name} and ${to.name}.`,
        destinations,
        segments,
        totalSeconds,
        weather,
        preference,
      };
    }
  }

  const zones: (string | null)[] = [];
  for (const seg of segments) {
    for (const l of seg.legs) {
      zones.push(l.from.zone, l.to.zone);
    }
  }

  return {
    ok: true,
    destinations,
    segments,
    totalSeconds,
    weather,
    preference,
    fare: computeFare(zones),
    bounds: [
      [minLat, minLon],
      [maxLat, maxLon],
    ],
  };
}
