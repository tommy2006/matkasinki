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
  /** 1-based position within its own day. */
  order: z.number(),
  /** 1-based day of the itinerary this stop belongs to. */
  day: z.number().default(1),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  category: z.string().optional(),
  dwellMinutes: z.number().optional(),
  /** Clock label for the map/timeline, e.g. "10:30". */
  timeLabel: z.string().optional(),
  /** One sentence on why this stop earns its place, given the user's prompt. */
  why: z.string().optional(),
});

export const RouteLegSchema = z.object({
  mode: z.string(),
  /** 1-based day of the itinerary this leg belongs to. */
  day: z.number().default(1),
  durationSeconds: z.number(),
  distanceMeters: z.number().optional(),
  fromName: z.string(),
  toName: z.string(),
  line: z.string().optional(),
  headsign: z.string().optional(),
  instruction: z.string(),
  polyline: z.array(z.tuple([z.number(), z.number()])),
});

export const ItineraryDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  /** Short line on the shape of the day — theme, pace, what it delivers. */
  summary: z.string().optional(),
  /** ISO date, only when the user gave real dates. */
  date: z.string().optional(),
});

export const LocalRoutePlanSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  origin: CoordinateSchema,
  /** One entry per day of the itinerary. Single-day plans have exactly one. */
  days: z.array(ItineraryDaySchema).default([]),
  stops: z.array(RouteStopSchema),
  legs: z.array(RouteLegSchema),
  savedAt: z.string(),
  demo: z.boolean().optional(),
});

export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type RouteStop = z.infer<typeof RouteStopSchema>;
export type RouteLeg = z.infer<typeof RouteLegSchema>;
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;
export type LocalRoutePlan = z.infer<typeof LocalRoutePlanSchema>;

export type PlaceCategory =
  | "museum"
  | "sight"
  | "restaurant"
  | "bar"
  | "cafe"
  | "historic"
  | "any";
