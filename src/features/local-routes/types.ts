import { z } from "zod";

export const CoordinateSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

export const PlaceSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  category: z.string().optional(),
  tags: z.record(z.string()).optional(),
});

export const RouteStopSchema = z.object({
  order: z.number(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  category: z.string().optional(),
  dwellMinutes: z.number().optional(),
});

export const RouteLegSchema = z.object({
  mode: z.string(),
  durationSeconds: z.number(),
  distanceMeters: z.number().optional(),
  fromName: z.string(),
  toName: z.string(),
  line: z.string().optional(),
  headsign: z.string().optional(),
  instruction: z.string(),
  polyline: z.array(z.tuple([z.number(), z.number()])),
});

export const LocalRoutePlanSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  origin: CoordinateSchema,
  stops: z.array(RouteStopSchema),
  legs: z.array(RouteLegSchema),
  savedAt: z.string(),
  demo: z.boolean().optional(),
});

export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type RouteStop = z.infer<typeof RouteStopSchema>;
export type RouteLeg = z.infer<typeof RouteLegSchema>;
export type LocalRoutePlan = z.infer<typeof LocalRoutePlanSchema>;

export type PlaceCategory =
  | "museum"
  | "sight"
  | "restaurant"
  | "bar"
  | "cafe"
  | "historic"
  | "any";
