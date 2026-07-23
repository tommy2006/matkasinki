import { tool } from "ai";
import { z } from "zod";
import {
  geocodePlace,
  planItinerary,
  searchPlaces,
  stopsFromCoordinates,
  type LocalRoutePlan,
  type PlaceCategory,
} from "@/features/local-routes";
import { getRoute, newRouteId, saveRoute } from "@/lib/local-routes/store";
import { cacheLegs, legsForRouteId } from "@/lib/local-routes/leg-cache";

const categoryEnum = z.enum([
  "museum",
  "sight",
  "restaurant",
  "bar",
  "cafe",
  "historic",
  "any",
]);

/**
 * Run a tool body without ever throwing. A thrown error inside `execute` escapes
 * the agent loop and kills the whole stream (the user loses the plan and map).
 * Returning the failure as data lets the model see it, tell the user, and carry
 * on with whatever else it has.
 */
async function guard<T>(name: string, fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[tool:${name}] failed —`, message);
    return {
      error:
        `${name} failed: ${message} ` +
        `Do not retry more than once. Tell the user briefly what was unavailable and continue ` +
        `with the information you already have.`,
    };
  }
}

export const routeTools = {
  searchPlaces: tool({
    description:
      "Search OpenStreetMap for places in Helsinki by category (museums, sights, restaurants, bars, etc.)",
    inputSchema: z.object({
      categories: z.array(categoryEnum).default(["any"]),
      limit: z.number().min(5).max(40).default(25),
    }),
    execute: async ({ categories, limit }) =>
      guard("searchPlaces", async () => {
        console.log("[using tool] searchPlaces", { categories, limit });
        const places = await searchPlaces(categories as PlaceCategory[], limit);
        // OSM hands back the full tag dictionary per place (addresses, opening
        // hours, phone, website, wheelchair, source…). The model only needs to
        // pick a stop, so send the four fields it picks on.
        return {
          count: places.length,
          places: places.map((p) => ({
            name: p.name,
            lat: p.lat,
            lon: p.lon,
            category: p.category,
          })),
        };
      }),
  }),

  geocodePlace: tool({
    description: "Resolve a place name or address in Helsinki to coordinates",
    inputSchema: z.object({
      text: z.string().min(1),
      limit: z.number().min(1).max(8).default(5),
    }),
    execute: async ({ text, limit }) =>
      guard("geocodePlace", async () => {
        console.log("[using tool] geocodePlace", { text, limit });
        const places = await geocodePlace(text, limit);
        return {
          count: places.length,
          places: places.map((p) => ({
            name: p.name,
            lat: p.lat,
            lon: p.lon,
            category: p.category,
          })),
        };
      }),
  }),

  planItinerary: tool({
    description:
      "Plan the HSL transit + walking route for ONE day of the itinerary. Pass that day's first stop " +
      "as origin, its last stop as destination, and the stops in between as via coordinates. " +
      "Call this once per day and pass the day number. Returns a routeId — hand that to savePlan " +
      "instead of copying the route geometry back yourself.",
    inputSchema: z.object({
      originLat: z.number(),
      originLon: z.number(),
      destinationLat: z.number(),
      destinationLon: z.number(),
      day: z.number().default(1).describe("Which day of the itinerary this route covers"),
      via: z
        .array(z.object({ lat: z.number(), lon: z.number(), name: z.string().optional() }))
        .optional(),
      departureIso: z.string().optional(),
    }),
    execute: async (input) =>
      guard("planItinerary", async () => {
        console.log("[using tool] planItinerary", { day: input.day, via: input.via?.length ?? 0 });
        const legs = await planItinerary({
          origin: { lat: input.originLat, lon: input.originLon },
          destination: { lat: input.destinationLat, lon: input.destinationLon },
          via: input.via?.map((v) => ({ lat: v.lat, lon: v.lon })),
          departureIso: input.departureIso,
          day: input.day,
        });

        // The geometry stays server-side; the model gets a handle to it.
        // `legs` here is polyline-free — enough for the model to narrate the
        // day, and it is what the chat's leg preview renders.
        const routeId = cacheLegs(legs);
        return {
          routeId,
          day: input.day,
          legCount: legs.length,
          legs: legs.map(({ polyline: _polyline, ...leg }) => leg),
        };
      }),
  }),

  savePlan: tool({
    description:
      "Save the final Helsinki itinerary for the user to view on the map. Covers the whole trip: " +
      "pass every day in `days`, and tag every stop and leg with the day it belongs to.",
    inputSchema: z.object({
      prompt: z.string(),
      title: z.string(),
      summary: z.string().optional(),
      originLat: z.number(),
      originLon: z.number(),
      days: z
        .array(
          z.object({
            day: z.number().describe("1-based day number"),
            title: z.string().describe('Short name for the day, e.g. "Day 2 — Design & sea"'),
            summary: z.string().optional().describe("One line on the shape and pace of the day"),
            date: z.string().optional().describe("ISO date, only if the user gave real dates"),
          }),
        )
        .default([{ day: 1, title: "Day 1" }]),
      stops: z.array(
        z.object({
          name: z.string(),
          lat: z.number(),
          lon: z.number(),
          day: z.number().default(1).describe("Which day of the itinerary this stop is on"),
          category: z.string().optional(),
          dwellMinutes: z.number().optional(),
          timeLabel: z.string().optional().describe('Clock time, e.g. "10:30"'),
          why: z
            .string()
            .describe(
              "One or two sentences on why this stop is worth it FOR THIS USER'S request — " +
                "tie it back to what they actually asked for. Required.",
            ),
        }),
      ),
      routeIds: z
        .array(z.string())
        .describe(
          "Every routeId returned by planItinerary, one per day, in day order. " +
            "The route geometry is looked up from these — do not retype it.",
        ),
    }),
    execute: async (input) =>
      guard("savePlan", async () => {
        console.log("[using tool] savePlan", {
          title: input.title,
          stops: input.stops.length,
          routeIds: input.routeIds,
        });

        // Trade the routeIds back for the geometry planItinerary set aside.
        // A miss means that day's route was never planned, so say which one
        // rather than silently saving a day with no line on the map.
        const legs: LocalRoutePlan["legs"] = [];
        const missing: string[] = [];
        for (const routeId of input.routeIds) {
          const cached = legsForRouteId(routeId);
          if (!cached) {
            missing.push(routeId);
            continue;
          }
          legs.push(...cached);
        }

        if (missing.length && legs.length === 0) {
          throw new Error(
            `No route geometry found for ${missing.join(", ")}. ` +
              `Call planItinerary for each day first, then pass the routeIds it returned.`,
          );
        }

        const stops = stopsFromCoordinates(input.stops);
        // Trust the stops over `days`: a day the model described but never gave
        // stops for would render as an empty tab.
        const dayNumbers = [...new Set(stops.map((s) => s.day))].sort((a, b) => a - b);
        const days = dayNumbers.map(
          (day) => input.days.find((d) => d.day === day) ?? { day, title: `Day ${day}` },
        );

        const plan: LocalRoutePlan = {
          id: newRouteId(),
          prompt: input.prompt,
          title: input.title,
          summary: input.summary,
          origin: { lat: input.originLat, lon: input.originLon },
          days,
          stops,
          legs,
          savedAt: new Date().toISOString(),
        };
        await saveRoute(plan);
        return { ok: true, id: plan.id, plan };
      }),
  }),
};

export async function extractSavedPlanFromToolOutput(
  output: unknown,
): Promise<LocalRoutePlan | null> {
  if (!output || typeof output !== "object") return null;
  const o = output as { plan?: LocalRoutePlan; id?: string };
  if (o.plan) return o.plan;
  if (o.id) return await getRoute(o.id);
  return null;
}
