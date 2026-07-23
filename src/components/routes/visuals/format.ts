import type {
  ItineraryDay,
  LocalRoutePlan,
  Place,
  RouteLeg,
  RouteStop,
} from "@/features/local-routes/types";

export type ModeStyle = {
  color: string;
  label: string;
  dash?: [number, number];
};

export function modeStyle(mode: string): ModeStyle {
  const m = mode.toUpperCase();
  if (m === "WALK") return { color: "#b8c4d9", label: "Walk", dash: [2, 2] };
  if (m === "BUS") return { color: "#fbbf24", label: "Bus" };
  if (m === "TRAM") return { color: "#34d399", label: "Tram" };
  if (m === "RAIL" || m === "SUBWAY") return { color: "#60a5fa", label: "Metro" };
  if (m === "FERRY") return { color: "#a78bfa", label: "Ferry" };
  if (m === "BICYCLE") return { color: "#f472b6", label: "Bike" };
  return { color: "#34d399", label: mode };
}

export function isWalkMode(mode: string): boolean {
  return mode.toUpperCase() === "WALK";
}

export function modeTag(mode: string, line?: string): string {
  const m = mode.toUpperCase();
  if (line && !isWalkMode(m)) return line;
  if (m === "RAIL" || m === "SUBWAY") return "METRO";
  return m.slice(0, 4);
}

export function modeColor(mode: string): string {
  return modeStyle(mode).color;
}

export function categoryTag(category?: string): string {
  if (!category) return "·";
  const c = category.toLowerCase();
  if (c.includes("museum")) return "mus";
  if (c.includes("restaurant")) return "eat";
  if (c.includes("bar") || c.includes("pub")) return "bar";
  if (c.includes("cafe")) return "caf";
  if (c.includes("historic")) return "his";
  return c.slice(0, 3);
}

export function formatDuration(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

export function planStats(stops: RouteStop[], legs: RouteLeg[]) {
  const totalSeconds = legs.reduce((s, l) => s + l.durationSeconds, 0);
  const walkSeconds = legs
    .filter((l) => isWalkMode(l.mode))
    .reduce((s, l) => s + l.durationSeconds, 0);
  const transitLegs = legs.filter((l) => !isWalkMode(l.mode)).length;
  return {
    stopCount: stops.length,
    totalMinutes: Math.round(totalSeconds / 60),
    walkMinutes: Math.round(walkSeconds / 60),
    transitLegs,
  };
}

export function statsLine(stops: RouteStop[], legs: RouteLeg[]): string {
  const s = planStats(stops, legs);
  return `${s.stopCount} stops · ${s.totalMinutes} min · ${s.transitLegs} transit · ${s.walkMinutes}m walk`;
}

export const ROUTE_LEGEND: ModeStyle[] = [
  modeStyle("WALK"),
  modeStyle("TRAM"),
  modeStyle("BUS"),
  modeStyle("RAIL"),
];

export const TOOL_LABELS: Record<string, string> = {
  searchPlaces: "Places",
  geocodePlace: "Geocode",
  planItinerary: "HSL route",
  savePlan: "Plan",
};

export function placeList(places: Place[], limit = 5): Place[] {
  return places.slice(0, limit);
}

export function stopMarkerTone(order: number, total: number): "start" | "mid" | "end" {
  if (order === 1) return "start";
  if (order === total) return "end";
  return "mid";
}

/**
 * Plans saved before itineraries went multi-day have no `day` on their stops
 * and legs, so everything without one belongs to day 1.
 */
export function dayOf(item: { day?: number }): number {
  return item.day && item.day > 0 ? item.day : 1;
}

/**
 * Day colours are deliberately distinct from the mode colours in `modeStyle`:
 * the map paints by mode inside a single day and by day across the whole trip,
 * so the two palettes are never on screen at the same time.
 */
const DAY_COLORS = [
  "#38bdf8",
  "#f472b6",
  "#facc15",
  "#4ade80",
  "#c084fc",
  "#fb923c",
  "#2dd4bf",
];

export function dayColor(day: number): string {
  return DAY_COLORS[(Math.max(1, day) - 1) % DAY_COLORS.length];
}

/**
 * The itinerary's days, falling back to days inferred from the stops when the
 * plan predates `plan.days` (or the model omitted it).
 */
export function planDays(plan: LocalRoutePlan): ItineraryDay[] {
  const numbers = [...new Set(plan.stops.map(dayOf))].sort((a, b) => a - b);
  const declared = plan.days ?? [];
  if (numbers.length === 0) return declared;

  return numbers.map((day) => {
    const match = declared.find((d) => d.day === day);
    return match ?? { day, title: `Day ${day}` };
  });
}

export function isMultiDay(plan: LocalRoutePlan): boolean {
  return planDays(plan).length > 1;
}

export function stopsForDay(plan: LocalRoutePlan, day: number | null): RouteStop[] {
  return day == null ? plan.stops : plan.stops.filter((s) => dayOf(s) === day);
}

export function legsForDay(plan: LocalRoutePlan, day: number | null): RouteLeg[] {
  return day == null ? plan.legs : plan.legs.filter((l) => dayOf(l) === day);
}

export function dayLabel(day: ItineraryDay): string {
  if (!day.date) return day.title;
  const parsed = new Date(day.date);
  if (Number.isNaN(parsed.getTime())) return day.title;
  const when = parsed.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${day.title} · ${when}`;
}
