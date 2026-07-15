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

const categoryEnum = z.enum([
  "museum",
  "sight",
  "restaurant",
  "bar",
  "cafe",
  "historic",
  "any",
]);

export const routeTools = {
  searchPlaces: tool({
    description:
      "Search OpenStreetMap for places in Helsinki by category (museums, sights, restaurants, bars, etc.)",
    inputSchema: z.object({
      categories: z.array(categoryEnum).default(["any"]),
      limit: z.number().min(5).max(40).default(25),
    }),
    execute: async ({ categories, limit }) => {
      const places = await searchPlaces(categories as PlaceCategory[], limit);
      return { count: places.length, places };
    },
  }),

  geocodePlace: tool({
    description: "Resolve a place name or address in Helsinki to coordinates",
    inputSchema: z.object({
      text: z.string().min(1),
      limit: z.number().min(1).max(8).default(5),
    }),
    execute: async ({ text, limit }) => {
      const places = await geocodePlace(text, limit);
      return { count: places.length, places };
    },
  }),

  planItinerary: tool({
    description:
      "Plan HSL transit + walking route through Helsinki. Pass origin, final destination, and optional via coordinates for intermediate stops.",
    inputSchema: z.object({
      originLat: z.number(),
      originLon: z.number(),
      destinationLat: z.number(),
      destinationLon: z.number(),
      via: z
        .array(z.object({ lat: z.number(), lon: z.number(), name: z.string().optional() }))
        .optional(),
      departureIso: z.string().optional(),
    }),
    execute: async (input) => {
      const legs = await planItinerary({
        origin: { lat: input.originLat, lon: input.originLon },
        destination: { lat: input.destinationLat, lon: input.destinationLon },
        via: input.via?.map((v) => ({ lat: v.lat, lon: v.lon })),
        departureIso: input.departureIso,
      });
      return { legCount: legs.length, legs };
    },
  }),

  savePlan: tool({
    description: "Save the final Helsinki route plan for the user to view on the map",
    inputSchema: z.object({
      prompt: z.string(),
      title: z.string(),
      summary: z.string().optional(),
      originLat: z.number(),
      originLon: z.number(),
      stops: z.array(
        z.object({
          name: z.string(),
          lat: z.number(),
          lon: z.number(),
          category: z.string().optional(),
          dwellMinutes: z.number().optional(),
        }),
      ),
      legs: z.array(
        z.object({
          mode: z.string(),
          durationSeconds: z.number(),
          distanceMeters: z.number().optional(),
          fromName: z.string(),
          toName: z.string(),
          line: z.string().optional(),
          headsign: z.string().optional(),
          instruction: z.string(),
          polyline: z.array(z.tuple([z.number(), z.number()])),
        }),
      ),
    }),
    execute: async (input) => {
      const plan: LocalRoutePlan = {
        id: newRouteId(),
        prompt: input.prompt,
        title: input.title,
        summary: input.summary,
        origin: { lat: input.originLat, lon: input.originLon },
        stops: stopsFromCoordinates(input.stops),
        legs: input.legs,
        savedAt: new Date().toISOString(),
      };
      saveRoute(plan);
      return { ok: true, id: plan.id, plan };
    },
  }),
};

export function extractSavedPlanFromToolOutput(output: unknown): LocalRoutePlan | null {
  if (!output || typeof output !== "object") return null;
  const o = output as { plan?: LocalRoutePlan; id?: string };
  if (o.plan) return o.plan;
  if (o.id) return getRoute(o.id);
  return null;
}
