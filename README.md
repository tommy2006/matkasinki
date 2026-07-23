# Matkasinki

**An HSL journey planner for the Helsinki region — plus an AI agent that turns a sentence into a real, day-by-day itinerary.**

Describe the trip you want (*"three days in Helsinki, museums and the sea"*) and the agent finds real places, plans genuine HSL transit + walking routes for each day, and draws the whole thing on the Digitransit map. Or skip the chat and build a route stop by stop.

Covers HSL zones A–E — Helsinki, Espoo, Vantaa, Kauniainen and the surrounding HSL municipalities — across bus, tram, metro, commuter rail and ferry.

---

## The three surfaces

| Route | What it does |
|---|---|
| `/chat` | **Chat planner.** Natural-language prompt → multi-day itinerary, drawn on the map with a day switcher. |
| `/journey` | **Journey builder.** Add two or more stops, get the fastest path, the zone ticket you need, and a weather-adjusted mode preference. |
| `/routes` | **Saved routes.** Every saved plan, re-drawn on the map. |

---

## Multi-day itineraries

A plan is a list of **days**, each with its own stops and route legs:

- Stops and legs carry a `day`; stops are numbered **per day**, so each day reads 1, 2, 3…
- Every stop carries a **`why`** — one or two sentences on what makes it worth *your* time, written against what you actually asked for.
- The map has a day switcher. Viewing the **whole trip** colours routes and pins **by day**; viewing **a single day** switches back to colouring by **transit mode** (walk / tram / bus / metro / ferry), with the legend following. The two palettes are never on screen at once.
- Transit legs get a badge on the map showing the line you actually board (`2`, `M1`, `Ferry`).
- You can **stop** a generation mid-stream, and the app suggests **follow-up questions** derived from the plan itself (*"Make day 2 lighter"*, *"What if it rains?"*) — those cost no tokens to produce.

Plans saved before multi-day support are treated as single-day plans, so old links keep working.

---

## How the agent works

`src/agents/route-planner` is a `ToolLoopAgent` (Vercel AI SDK) running Claude with four tools:

| Tool | Does |
|---|---|
| `searchPlaces` | Finds real POIs in Helsinki via OpenStreetMap / Overpass (with mirror failover and a 15-min cache). |
| `geocodePlace` | Resolves a name or address to coordinates via Digitransit geocoding. |
| `planItinerary` | Plans the HSL transit + walking route for **one day**. Called once per day. |
| `savePlan` | Persists the finished itinerary and hands it to the map. |

Two things are worth knowing if you touch this code:

- **Route geometry never goes to the model.** `planItinerary` keeps the polylines server-side ([`src/lib/local-routes/leg-cache.ts`](src/lib/local-routes/leg-cache.ts)) and returns a short `routeId`; `savePlan` trades the ids back for the real legs. Sending hundreds of coordinate pairs to the model and having it echo them back was the dominant token cost on multi-day trips, and a frequent truncation point.
- **The step cap scales with days.** A multi-day plan needs a step per day for `planItinerary`, plus lookups, `savePlan` and the reply. Too low a cap and the loop dies mid-routing, `savePlan` never runs, and no map is drawn at all.

The agent runs in **demo mode by default** — canned sample plans, no API calls, no key needed. Set `MATKASINKI_LIVE_AGENT=1` *and* provide `ANTHROPIC_API_KEY` to run the real agent.

---

## Getting started

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

Open <http://localhost:3000>. With no keys at all you still get the full UI and the demo planner.

### Environment

Everything is optional for a demo-mode run. Fill in what you need:

| Variable | Needed for |
|---|---|
| `ANTHROPIC_API_KEY` | The live AI planner. |
| `MATKASINKI_LIVE_AGENT` | Set to `1` to leave demo mode. Anything else keeps demo plans. |
| `AI_ROUTE_MODEL` | Override the planner model (defaults to the interactive model in `src/agents/shared/llm.ts`). |
| `DIGITRANSIT_API_KEY` | Live HSL routing, geocoding and map tiles. Free key at [portal-api.digitransit.fi](https://portal-api.digitransit.fi/). `DIGITRANSIT_PRIMARY_KEY` / `_SECONDARY_KEY` also accepted. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Persisting saved routes. |

Weather comes from [Open-Meteo](https://open-meteo.com) and needs no key.

`.env` is git-ignored — never commit real keys.

### Saved routes table

Route persistence expects a Supabase table `routes`:

| Column | Type |
|---|---|
| `id` | `text` primary key |
| `prompt`, `title`, `summary` | `text` |
| `data` | `jsonb` — the full plan |
| `created_at` | `timestamptz` default `now()` |

---

## Scripts

| Command | |
|---|---|
| `npm run dev` | Next dev server. |
| `npm run build` / `npm start` | Production build and serve. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | Next lint. |
| `npm run app` | Build and launch the Electron desktop shell. |
| `npm run dist` | Package the desktop app via electron-builder. |

To regenerate the offline transit graph from Digitransit:

```bash
node build-network.mjs
```

That writes `src/data/hsl-network.json` (~7 MB), which `src/lib/hsl/network.ts` loads **server-side only** as a fallback when the live routing API is unavailable.

---

## Layout

```
src/
  app/
    page.tsx              landing page
    chat/                 AI chat planner
    journey/              stop-by-stop journey builder
    (travel)/routes/      saved routes
    api/                  chat, journey, routes, stops, weather, map tiles
  agents/route-planner/   ToolLoopAgent: tools, system prompt, demo stream
  components/routes/      map, day tabs, timeline, chat UI
  features/local-routes/  OSM search, Digitransit routing, sample plans
  lib/hsl/                routing graph, fares, weather, Digitransit client
  lib/local-routes/       plan store, leg cache
electron/                 desktop shell
```

Map tiles are proxied through `/api/tiles/[z]/[x]/[y]` so the Digitransit key stays server-side.

---

## Notes

- **Fares** (`src/lib/hsl/fare.ts`) implement HSL's contiguous-zone rule: a trip touching zones A and C needs an ABC ticket, because B sits between them.
- **Weather** biases mode choice — wet or snowy days prefer covered transport (train, metro, bus) and penalise walking and ferries.
- Data © Digitransit / HSL and © OpenStreetMap contributors.
