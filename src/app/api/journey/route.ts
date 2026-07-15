import { digitransitKey, planDigitransitJourney } from "@/lib/hsl/digitransit";
import { getStop, toLite } from "@/lib/hsl/network";
import { planItinerary as planStaticItinerary } from "@/lib/hsl/route";
import type { JourneyResult, StopLite } from "@/lib/hsl/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    stopIds?: string[];
    destinations?: StopLite[];
  };

  let destinations: StopLite[] = [];

  if (Array.isArray(body.destinations) && body.destinations.length > 0) {
    destinations = body.destinations.filter(
      (d) => d && typeof d.lat === "number" && typeof d.lon === "number" && typeof d.name === "string",
    );
  } else {
    const stopIds = Array.isArray(body.stopIds)
      ? body.stopIds.filter((x) => typeof x === "string")
      : [];
    destinations = stopIds
      .map((id) => getStop(id))
      .filter(Boolean)
      .map((s) => toLite(s!));
  }

  if (digitransitKey()) {
    try {
      return Response.json(await planDigitransitJourney(destinations));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Digitransit routing failed";
      if (destinations.every((d) => getStop(d.id))) {
        const fallback = planStaticItinerary(destinations.map((d) => d.id));
        return Response.json({ ...fallback, warning: `${message} — used offline graph` });
      }
      return Response.json(
        {
          ok: false,
          error: message,
          destinations,
          segments: [],
          totalSeconds: 0,
          weather: { date: "", condition: "", tempC: 0, precipitationMm: 0, windKmh: 0, summary: "" },
          preference: { rain: false, preferredModes: [], avoid: [], message: "" },
        },
        { status: 502 },
      );
    }
  }

  const stopIds = destinations.map((d) => d.id);
  return Response.json(planStaticItinerary(stopIds));
}
