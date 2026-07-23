import type { RouteLeg } from "@/features/local-routes/types";

/**
 * Polylines are the bulk of a plan's payload — hundreds of coordinate pairs per
 * leg. Sending them to the model and having it echo them back into savePlan
 * costs enormous numbers of tokens, is slow, and is a common truncation point
 * on multi-day trips.
 *
 * So planItinerary keeps the geometry here and hands the model a short
 * `routeId` instead; savePlan trades the ids back for the real legs. Both calls
 * happen inside one agent run in one process, so a plain in-memory map is
 * enough — entries are only a safety net against a run that never saves.
 */
const legsByRouteId = new Map<string, { at: number; legs: RouteLeg[] }>();

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 200;

function evictStale(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, entry] of legsByRouteId) {
    if (entry.at < cutoff) legsByRouteId.delete(id);
  }
  // Map preserves insertion order, so the first keys are the oldest.
  while (legsByRouteId.size > MAX_ENTRIES) {
    const oldest = legsByRouteId.keys().next().value;
    if (oldest === undefined) break;
    legsByRouteId.delete(oldest);
  }
}

export function cacheLegs(legs: RouteLeg[]): string {
  evictStale();
  const routeId = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  legsByRouteId.set(routeId, { at: Date.now(), legs });
  return routeId;
}

export function legsForRouteId(routeId: string): RouteLeg[] | null {
  return legsByRouteId.get(routeId)?.legs ?? null;
}
