import { planTrip, planDay, type TripPlanInput } from "@/features/trip-planner";
import { readState, updateState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<TripPlanInput> & {
    action?: "generate" | "swap" | "save";
    dayIndex?: number;
    salt?: number;
    date?: string;
    itinerary?: unknown;
  };

  const vibe = body.vibe || readState().profile?.vibe || "explorer";
  const input: TripPlanInput = {
    destination: body.destination || readState().trip?.destination || "Porto, Portugal",
    dates: body.dates || { start: new Date().toISOString().slice(0, 10), end: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) },
    budget: body.budget,
    vibe,
  };

  if (body.action === "save") {
    updateState((s) => {
      s.trip = { destination: input.destination, dates: input.dates, budget: input.budget, itinerary: body.itinerary };
    });
    return Response.json({ ok: true });
  }

  if (body.action === "swap" && typeof body.dayIndex === "number" && body.date) {
    const day = planDay(input, body.date, body.dayIndex, (body.salt ?? 0) + 1);
    return Response.json({ day });
  }

  const itinerary = await planTrip(input);
  return Response.json({ itinerary, destination: input.destination });
}
