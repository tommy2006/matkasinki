// SERVER-ONLY. Best-path routing across the HSL network graph (build-network.mjs
// output) using Dijkstra with a boarding-transfer model and weather bias.
//
// State = (stop, route-you-arrived-on). Continuing on the same route is free;
// boarding a different route pays a wait penalty (~headway/2). Walking transfers
// switch you to a "walk" state. When it's raining, walking and ferry legs are
// penalised so the search naturally prefers trains, the metro and buses.

import { computeFare } from "./fare";
import { getStop, haversine, loadNetwork, toLite } from "./network";
import type { JourneyLeg, JourneyResult, JourneySegment, Mode, StopLite, TransportPreference } from "./types";
import { loadWeather, transportPreference } from "./weather";

// vehicle speeds (m/s) — rough HSL averages incl. acceleration
const SPEED: Record<string, number> = { SUBWAY: 16.5, RAIL: 19, TRAM: 6, BUS: 7, FERRY: 5, TAXI: 8 };
// boarding wait (s) ≈ headway/2 — frequent rail/metro board faster than buses
const BOARD: Record<string, number> = { SUBWAY: 180, RAIL: 210, TRAM: 240, BUS: 270, FERRY: 360, TAXI: 300 };
const DWELL = 25; // s per stop
const WALK_SPEED = 1.3; // m/s
const WALK_BUFFER = 20; // s per walk transfer

const WALK = "__walk__";

function speed(mode: string): number {
  return SPEED[mode] ?? 7;
}

/* ---------------- binary min-heap ---------------- */
class MinHeap {
  private a: { cost: number; key: string; stop: string; route: string }[] = [];
  get size() {
    return this.a.length;
  }
  push(item: { cost: number; key: string; stop: string; route: string }) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].cost <= a[i].cost) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].cost < a[m].cost) m = l;
        if (r < a.length && a[r].cost < a[m].cost) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

interface EdgeBack {
  prevKey: string;
  from: string;
  to: string;
  route: string; // route id, or WALK
  mode: string;
  meters: number; // walk edge length (0 for rides)
  cost: number;
}

/** Shortest path between two stops. Returns ordered raw edges, or null. */
function shortestEdges(originId: string, destId: string, pref: TransportPreference): EdgeBack[] | null {
  const net = loadNetwork();
  if (!net.stops[originId] || !net.stops[destId]) return null;

  const walkMult = pref.rain ? 2.6 : 1;
  const ferryMult = pref.rain ? 2.2 : 1;

  const dist = new Map<string, number>();
  const back = new Map<string, EdgeBack>();
  const heap = new MinHeap();
  const startKey = `${originId}|${WALK}`;
  dist.set(startKey, 0);
  heap.push({ cost: 0, key: startKey, stop: originId, route: WALK });

  let goalKey: string | null = null;
  while (heap.size) {
    const cur = heap.pop();
    if (cur.cost > (dist.get(cur.key) ?? Infinity)) continue;
    if (cur.stop === destId) {
      goalKey = cur.key;
      break;
    }
    const here = net.stops[cur.stop];
    if (!here) continue;

    const relax = (to: string, route: string, mode: string, edgeCost: number, meters: number) => {
      const key = `${to}|${route}`;
      const nd = cur.cost + edgeCost;
      if (nd < (dist.get(key) ?? Infinity)) {
        dist.set(key, nd);
        back.set(key, { prevKey: cur.key, from: cur.stop, to, route, mode, meters, cost: edgeCost });
        heap.push({ cost: nd, key, stop: to, route });
      }
    };

    // ride edges
    for (const e of net.adjacency[cur.stop] ?? []) {
      const to = net.stops[e.to];
      if (!to) continue;
      const geo = haversine(here, to);
      for (const r of e.routes) {
        const mode = net.routes[r]?.mode ?? "BUS";
        let cost = geo / speed(mode) + DWELL;
        if (mode === "FERRY") cost *= ferryMult;
        if (cur.route !== r) cost += BOARD[mode] ?? 270; // pay to board a new line
        relax(e.to, r, mode, cost, 0);
      }
    }
    // walking transfers
    for (const w of net.transfers[cur.stop] ?? []) {
      if (!net.stops[w.to]) continue;
      relax(w.to, WALK, "WALK", (w.dist / WALK_SPEED + WALK_BUFFER) * walkMult, w.dist);
    }
  }

  if (!goalKey) return null;
  const edges: EdgeBack[] = [];
  let k: string | undefined = goalKey;
  while (k && back.has(k)) {
    const e: EdgeBack = back.get(k)!;
    edges.push(e);
    k = e.prevKey;
  }
  edges.reverse();
  return edges;
}

/** Compress consecutive same-route edges into display legs. */
function edgesToLegs(edges: EdgeBack[]): JourneyLeg[] {
  const net = loadNetwork();
  const legs: JourneyLeg[] = [];
  for (const e of edges) {
    const fromStop = getStop(e.from)!;
    const toStop = getStop(e.to)!;
    const last = legs[legs.length - 1];
    const isWalk = e.route === WALK;
    const sameRun = last && !isWalk && last.kind === "ride" && last.routeShortName !== undefined && last.mode === e.mode && legRouteId(last) === e.route;
    const sameWalk = last && isWalk && last.kind === "walk";

    if (sameRun) {
      last.to = toLite(toStop);
      last.numStops = (last.numStops ?? 1) + 1;
      last.seconds += e.cost;
      last.path.push([toStop.lat, toStop.lon]);
    } else if (sameWalk) {
      last.to = toLite(toStop);
      last.walkMeters = (last.walkMeters ?? 0) + e.meters;
      last.seconds += e.cost;
      last.path.push([toStop.lat, toStop.lon]);
    } else if (isWalk) {
      legs.push({
        kind: "walk",
        mode: "WALK",
        from: toLite(fromStop),
        to: toLite(toStop),
        walkMeters: e.meters,
        seconds: e.cost,
        path: [
          [fromStop.lat, fromStop.lon],
          [toStop.lat, toStop.lon],
        ],
      });
    } else {
      const route = net.routes[e.route];
      legs.push({
        kind: "ride",
        mode: (route?.mode as Mode) ?? "BUS",
        routeShortName: route?.shortName ?? null,
        routeLongName: route?.longName ?? null,
        color: route?.color ?? null,
        from: toLite(fromStop),
        to: toLite(toStop),
        numStops: 1,
        seconds: e.cost,
        path: [
          [fromStop.lat, fromStop.lon],
          [toStop.lat, toStop.lon],
        ],
        // stash the route id on the leg for run-merging (stripped from API output type via cast)
        ...( { _routeId: e.route } as object ),
      });
    }
  }
  return legs;
}
function legRouteId(leg: JourneyLeg): string | undefined {
  return (leg as unknown as { _routeId?: string })._routeId;
}

/**
 * Plan a full itinerary of >= 2 HSL destinations: route each consecutive pair
 * and stitch the legs together. Weather from the dummy JSON biases every leg.
 */
export function planItinerary(stopIds: string[]): JourneyResult {
  const weather = loadWeather();
  const preference = transportPreference(weather);
  const net = loadNetwork();

  const destinations: StopLite[] = stopIds
    .map((id) => net.stops[id])
    .filter(Boolean)
    .map(toLite);

  if (destinations.length < 2) {
    return { ok: false, error: "Add at least two HSL destinations.", destinations, segments: [], totalSeconds: 0, weather, preference };
  }

  const segments: JourneySegment[] = [];
  let totalSeconds = 0;
  let minLat = 90, minLon = 180, maxLat = -90, maxLon = -180;
  const extend = (lat: number, lon: number) => {
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
  };

  for (let i = 0; i < stopIds.length - 1; i++) {
    const edges = shortestEdges(stopIds[i], stopIds[i + 1], preference);
    if (!edges || edges.length === 0) {
      return {
        ok: false,
        error: `No HSL route found between ${net.stops[stopIds[i]]?.name ?? "?"} and ${net.stops[stopIds[i + 1]]?.name ?? "?"}.`,
        destinations, segments, totalSeconds, weather, preference,
      };
    }
    const legs = edgesToLegs(edges);
    // strip internal _routeId before returning
    for (const l of legs) delete (l as unknown as { _routeId?: string })._routeId;
    const secs = legs.reduce((a, l) => a + l.seconds, 0);
    totalSeconds += secs;
    for (const l of legs) for (const [la, lo] of l.path) extend(la, lo);
    segments.push({
      fromName: net.stops[stopIds[i]].name,
      toName: net.stops[stopIds[i + 1]].name,
      legs,
      seconds: secs,
    });
  }

  // Fare: every zone the route actually passes through (all leg endpoints).
  const zones: (string | null)[] = [];
  for (const seg of segments) for (const l of seg.legs) { zones.push(l.from.zone, l.to.zone); }

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
