// Build a static transit-network graph for the whole HSL region from the
// Digitransit routing API and emit it as one self-contained .js module.
//
//   node scripts/build-network.mjs
//
// Output: src/data/hsl-network.js  (ESM: import { stops, routes, ... })
// The `hsl` GraphQL router covers exactly the HSL region (Helsinki, Espoo,
// Vantaa, Kauniainen + surrounding HSL municipalities), across every mode:
// bus, tram, metro (subway), commuter rail, ferry.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// build-network.mjs lives at the repo root, so ROOT is __dirname.
const ROOT = __dirname;
const OUT = path.join(ROOT, 'src', 'data', 'hsl-network.json');
const API = 'https://api.digitransit.fi/routing/v2/hsl/gtfs/v1';

function apiKey() {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = env.match(/DIGITRANSIT_PRIMARY_KEY=(.*)/);
  if (!m) throw new Error('DIGITRANSIT_PRIMARY_KEY not found in .env');
  return m[1].trim();
}

const KEY = apiKey();

async function gql(query, variables = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'digitransit-subscription-key': KEY,
        },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors && json.errors.length) throw new Error(json.errors.map((e) => e.message).join('; '));
      return json.data;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

// ---- 1. All routes in the HSL region -------------------------------------

async function fetchAllRoutes() {
  const data = await gql(`{ routes { gtfsId shortName longName mode type color } }`);
  return data.routes || [];
}

// ---- 2. Patterns (ordered stop sequences) per route, in batches ----------
// One pattern = one variant of a route in one direction. Its ordered `stops`
// list is what gives us the edges (consecutive stop -> stop) of the network.

async function fetchPatternsForRoutes(ids) {
  // Build an aliased multi-route query so we fetch many routes per request.
  const parts = ids.map(
    (id, i) => `r${i}: route(id:${JSON.stringify(id)}){
      gtfsId
      patterns{
        code directionId headsign
        stops{ gtfsId }
      }
    }`
  );
  const data = await gql(`{ ${parts.join('\n')} }`);
  return ids.map((_, i) => data[`r${i}`]).filter(Boolean);
}

// ---- 3. All stops with coordinates / mode / zone -------------------------

async function fetchAllStops() {
  const data = await gql(`{
    stops { gtfsId name code lat lon zoneId vehicleMode locationType parentStation{ gtfsId } }
  }`);
  return data.stops || [];
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Haversine distance in metres.
function distM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function main() {
  console.log('Fetching routes…');
  const routesRaw = await fetchAllRoutes();
  console.log(`  ${routesRaw.length} routes`);

  console.log('Fetching all stops…');
  const stopsRaw = await fetchAllStops();
  console.log(`  ${stopsRaw.length} stops`);

  console.log('Fetching patterns (ordered stops) per route…');
  const batches = chunk(routesRaw.map((r) => r.gtfsId), 25);
  const routeDetails = [];
  let done = 0;
  for (const b of batches) {
    routeDetails.push(...(await fetchPatternsForRoutes(b)));
    done += b.length;
    process.stdout.write(`\r  ${done}/${routesRaw.length}`);
  }
  process.stdout.write('\n');

  // ---- Assemble stops map -----------------------------------------------
  const stops = {};
  for (const s of stopsRaw) {
    stops[s.gtfsId] = {
      id: s.gtfsId,
      name: s.name,
      code: s.code || null,
      lat: s.lat,
      lon: s.lon,
      zone: s.zoneId || null,
      mode: s.vehicleMode || null,
      parent: (s.parentStation && s.parentStation.gtfsId) || null,
      routes: [], // filled below
    };
  }

  // ---- Assemble routes map + directed adjacency -------------------------
  const routeMeta = new Map(routesRaw.map((r) => [r.gtfsId, r]));
  const routes = {};
  // adjacency: fromStop -> Map(toStop -> Set(routeId))
  const adj = new Map();
  const addEdge = (from, to, routeId) => {
    if (!adj.has(from)) adj.set(from, new Map());
    const m = adj.get(from);
    if (!m.has(to)) m.set(to, new Set());
    m.get(to).add(routeId);
  };

  for (const rd of routeDetails) {
    const meta = routeMeta.get(rd.gtfsId) || {};
    const patterns = (rd.patterns || []).map((p) => {
      const seq = (p.stops || []).map((s) => s.gtfsId).filter((id) => stops[id]);
      // record route on each served stop + build edges between consecutive stops
      for (let i = 0; i < seq.length; i++) {
        if (!stops[seq[i]].routes.includes(rd.gtfsId)) stops[seq[i]].routes.push(rd.gtfsId);
        if (i > 0) addEdge(seq[i - 1], seq[i], rd.gtfsId);
      }
      return { code: p.code, dir: p.directionId, headsign: p.headsign || null, stops: seq };
    });
    routes[rd.gtfsId] = {
      id: rd.gtfsId,
      shortName: meta.shortName || null,
      longName: meta.longName || null,
      mode: meta.mode || null,
      color: meta.color ? `#${meta.color}` : null,
      patterns,
    };
  }

  // Flatten adjacency into a plain, serialisable object.
  const adjacency = {};
  const connections = []; // undirected-ish edge list with the routes that use each
  const seenPair = new Set();
  for (const [from, m] of adj) {
    adjacency[from] = [];
    for (const [to, routeSet] of m) {
      const rs = [...routeSet];
      adjacency[from].push({ to, routes: rs });
      const key = from < to ? `${from}|${to}` : `${to}|${from}`;
      if (!seenPair.has(key)) {
        seenPair.add(key);
        connections.push({ a: from, b: to, routes: rs });
      }
    }
  }

  // ---- Walking transfers: nearby stops (<= 200 m, different stop) --------
  // Spatial hash on a ~0.003° grid (~200-330 m) to avoid O(n^2).
  const CELL = 0.003;
  const grid = new Map();
  const cellKey = (lat, lon) => `${Math.floor(lat / CELL)},${Math.floor(lon / CELL)}`;
  for (const s of Object.values(stops)) {
    const k = cellKey(s.lat, s.lon);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(s);
  }
  const transfers = {};
  const MAX_WALK = 200;
  for (const s of Object.values(stops)) {
    const ci = Math.floor(s.lat / CELL), cj = Math.floor(s.lon / CELL);
    const near = [];
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++) {
        const bucket = grid.get(`${ci + di},${cj + dj}`);
        if (bucket) near.push(...bucket);
      }
    const links = [];
    for (const o of near) {
      if (o.id === s.id) continue;
      const d = distM(s, o);
      if (d <= MAX_WALK) links.push({ to: o.id, dist: Math.round(d) });
    }
    if (links.length) {
      links.sort((x, y) => x.dist - y.dist);
      transfers[s.id] = links.slice(0, 12);
    }
  }

  // ---- Route-to-route interchange links --------------------------------
  // Two routes are "linked" if they share at least one stop; record the
  // shared stops so a planner knows where riders can change between them.
  const routeLinks = {};
  for (const r of Object.keys(routes)) routeLinks[r] = {};
  for (const s of Object.values(stops)) {
    const rs = s.routes;
    for (let i = 0; i < rs.length; i++)
      for (let j = i + 1; j < rs.length; j++) {
        (routeLinks[rs[i]][rs[j]] ||= []).push(s.id);
        (routeLinks[rs[j]][rs[i]] ||= []).push(s.id);
      }
  }
  // Convert to arrays of { route, atStops } and drop routes with no shared stop.
  const routeLinksOut = {};
  for (const [r, links] of Object.entries(routeLinks)) {
    const arr = Object.entries(links).map(([other, atStops]) => ({ route: other, atStops }));
    if (arr.length) routeLinksOut[r] = arr;
  }

  // Trim stops that are served by no route AND have no transfer (isolated noise).
  for (const id of Object.keys(stops)) {
    if (!stops[id].routes.length && !transfers[id]) delete stops[id];
  }

  const modeCounts = {};
  for (const r of Object.values(routes)) modeCounts[r.mode] = (modeCounts[r.mode] || 0) + 1;

  const meta = {
    generated: new Date().toISOString(),
    region: 'HSL',
    source: 'Digitransit routing API (hsl router)',
    counts: {
      stops: Object.keys(stops).length,
      routes: Object.keys(routes).length,
      connections: connections.length,
      routesByMode: modeCounts,
    },
  };

  // ---- Emit one JSON file (loaded via fs at runtime, never bundled) -----
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const payload = { meta, stops, routes, adjacency, connections, transfers, routeLinks };
  fs.writeFileSync(OUT, JSON.stringify(payload));
  const bytes = fs.statSync(OUT).size;
  console.log(`\nWrote ${OUT}`);
  console.log(`  ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  ${meta.counts.stops} stops, ${meta.counts.routes} routes, ${meta.counts.connections} connections`);
  console.log(`  routesByMode:`, modeCounts);
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
