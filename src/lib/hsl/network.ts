// SERVER-ONLY loader for the generated HSL network (src/data/hsl-network.json,
// produced by build-network.mjs from the Digitransit routing API). Loaded once
// via fs and cached; never bundled to the client (7 MB).

import fs from "node:fs";
import path from "node:path";
import type { StopLite } from "./types";

export interface HslStop {
  id: string;
  name: string;
  code: string | null;
  lat: number;
  lon: number;
  zone: string | null;
  mode: string | null;
  parent: string | null;
  routes: string[];
}
export interface HslRoute {
  id: string;
  shortName: string | null;
  longName: string | null;
  mode: string | null;
  color: string | null;
}
export interface HslNetwork {
  meta: { counts: Record<string, unknown>; [k: string]: unknown };
  stops: Record<string, HslStop>;
  routes: Record<string, HslRoute>;
  adjacency: Record<string, { to: string; routes: string[] }[]>;
  transfers: Record<string, { to: string; dist: number }[]>;
}

// Travel is limited to the HSL ticket zones A–E only.
export const HSL_ZONES = ["A", "B", "C", "D", "E"] as const;
export function inHslZones(s: { zone: string | null }): boolean {
  return !!s.zone && (HSL_ZONES as readonly string[]).includes(s.zone);
}

let cache: HslNetwork | null = null;
export function loadNetwork(): HslNetwork {
  if (cache) return cache;
  const p = path.join(process.cwd(), "src", "data", "hsl-network.json");
  cache = JSON.parse(fs.readFileSync(p, "utf8")) as HslNetwork;
  return cache;
}

export function toLite(s: HslStop): StopLite {
  return { id: s.id, name: s.name, code: s.code, zone: s.zone, mode: s.mode, lat: s.lat, lon: s.lon };
}

export function getStop(id: string): HslStop | undefined {
  return loadNetwork().stops[id];
}

/** Haversine distance in metres. */
export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const MODE_RANK: Record<string, number> = { SUBWAY: 0, RAIL: 1, TRAM: 2, FERRY: 3, BUS: 4 };

/**
 * Search selectable destinations — HSL zones A–E only. De-duplicates the many
 * same-named stop nodes (platforms / both directions) to the best-connected one,
 * and ranks name-prefix matches and rail/metro hubs first.
 */
export function searchStops(q: string, limit = 8): StopLite[] {
  const net = loadNetwork();
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: HslStop[] = [];
  for (const s of Object.values(net.stops)) {
    if (!s.name || !inHslZones(s)) continue;
    const name = s.name.toLowerCase();
    if (name.includes(needle) || (s.code && s.code.toLowerCase().includes(needle))) hits.push(s);
  }
  // keep the best node per unique name (most routes wins; rail/metro breaks ties)
  const byName = new Map<string, HslStop>();
  for (const s of hits) {
    const k = s.name.toLowerCase();
    const cur = byName.get(k);
    if (!cur || s.routes.length > cur.routes.length) byName.set(k, s);
  }
  return [...byName.values()]
    .sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(needle) ? 0 : 1;
      const bp = b.name.toLowerCase().startsWith(needle) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const am = MODE_RANK[a.mode ?? ""] ?? 9;
      const bm = MODE_RANK[b.mode ?? ""] ?? 9;
      if (am !== bm) return am - bm;
      return b.routes.length - a.routes.length;
    })
    .slice(0, limit)
    .map(toLite);
}
