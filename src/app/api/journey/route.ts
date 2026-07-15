import { planItinerary } from "@/lib/hsl/route";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Plan the best HSL path across an itinerary of >= 2 destinations.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { stopIds?: string[] };
  const stopIds = Array.isArray(body.stopIds) ? body.stopIds.filter((x) => typeof x === "string") : [];
  return Response.json(planItinerary(stopIds));
}
