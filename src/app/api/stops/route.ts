import { digitransitKey, searchDigitransitStops } from "@/lib/hsl/digitransit";
import { searchStops } from "@/lib/hsl/network";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";

  if (digitransitKey()) {
    try {
      const stops = await searchDigitransitStops(q, 8);
      if (stops.length > 0) return Response.json({ stops, source: "digitransit" });
    } catch {
      /* fall through to offline graph */
    }
  }

  return Response.json({ stops: searchStops(q, 8), source: "offline" });
}
