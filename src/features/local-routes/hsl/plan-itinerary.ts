import { decodeDigitransitPolyline } from "../decode-polyline";
import type { Coordinate, RouteLeg, RouteStop } from "../types";
import { hslGraphql } from "./client";

const PLAN_QUERY = `
query PlanHelsinki(
  $originLat: CoordinateValue!
  $originLon: CoordinateValue!
  $destLat: CoordinateValue!
  $destLon: CoordinateValue!
  $via: [PlanViaLocationInput!]
  $departure: OffsetDateTime
) {
  planConnection(
    origin: { location: { coordinate: { latitude: $originLat, longitude: $originLon } } }
    destination: { location: { coordinate: { latitude: $destLat, longitude: $destLon } } }
    via: $via
    first: 1
    dateTime: { earliestDeparture: $departure }
    modes: { transit: { transit: [{ mode: BUS }, { mode: TRAM }, { mode: RAIL }, { mode: SUBWAY }, { mode: FERRY }] } }
  ) {
    edges {
      node {
        duration
        walkDistance
        legs {
          mode
          duration
          distance
          from { name lat lon }
          to { name lat lon }
          trip { routeShortName tripHeadsign }
          legGeometry { points }
        }
      }
    }
  }
}
`;

interface PlanInput {
  origin: Coordinate;
  destination: Coordinate;
  via?: Coordinate[];
  departureIso?: string;
  /** Itinerary day these legs belong to — one planItinerary call per day. */
  day?: number;
}

interface RawLeg {
  mode?: string;
  duration?: number;
  distance?: number;
  from?: { name?: string; lat?: number; lon?: number };
  to?: { name?: string; lat?: number; lon?: number };
  trip?: { routeShortName?: string; tripHeadsign?: string };
  legGeometry?: { points?: string };
}

function formatLegInstruction(leg: RawLeg): string {
  const mode = (leg.mode ?? "WALK").toUpperCase();
  const from = leg.from?.name ?? "Start";
  const to = leg.to?.name ?? "End";
  const mins = Math.max(1, Math.round((leg.duration ?? 0) / 60));
  if (mode === "WALK") return `Walk ${mins} min from ${from} to ${to}`;
  const line = leg.trip?.routeShortName ? `${mode} ${leg.trip.routeShortName}` : mode;
  const headsign = leg.trip?.tripHeadsign ? ` toward ${leg.trip.tripHeadsign}` : "";
  return `Take ${line}${headsign} (${mins} min): ${from} → ${to}`;
}

export async function planItinerary(input: PlanInput): Promise<RouteLeg[]> {
  const via =
    input.via?.map((c) => ({
      visit: { coordinate: { latitude: c.lat, longitude: c.lon } },
    })) ?? [];

  const data = await hslGraphql<{
    planConnection?: { edges?: { node?: { legs?: RawLeg[] } }[] };
  }>(PLAN_QUERY, {
    originLat: input.origin.lat,
    originLon: input.origin.lon,
    destLat: input.destination.lat,
    destLon: input.destination.lon,
    via: via.length ? via : undefined,
    departure: input.departureIso ?? new Date().toISOString(),
  });

  const legs = data.planConnection?.edges?.[0]?.node?.legs ?? [];
  const day = input.day && input.day > 0 ? input.day : 1;
  return legs.map((leg) => ({
    mode: leg.mode ?? "WALK",
    day,
    durationSeconds: leg.duration ?? 0,
    distanceMeters: leg.distance,
    fromName: leg.from?.name ?? "",
    toName: leg.to?.name ?? "",
    line: leg.trip?.routeShortName,
    headsign: leg.trip?.tripHeadsign,
    instruction: formatLegInstruction(leg),
    polyline: decodeDigitransitPolyline(leg.legGeometry?.points ?? ""),
  }));
}

interface StopInput {
  name: string;
  lat: number;
  lon: number;
  day?: number;
  category?: string;
  dwellMinutes?: number;
  timeLabel?: string;
  why?: string;
}

/**
 * Numbers stops per day rather than across the whole trip, so the map pins on
 * each day read 1, 2, 3… — the numbering a traveller expects when they are
 * looking at one day at a time.
 */
export function stopsFromCoordinates(coords: StopInput[]): RouteStop[] {
  const seenPerDay = new Map<number, number>();

  return coords.map((c) => {
    const day = c.day && c.day > 0 ? c.day : 1;
    const order = (seenPerDay.get(day) ?? 0) + 1;
    seenPerDay.set(day, order);

    return {
      order,
      day,
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      category: c.category,
      dwellMinutes: c.dwellMinutes ?? (order === 1 ? 0 : 45),
      timeLabel: c.timeLabel,
      why: c.why,
    };
  });
}
