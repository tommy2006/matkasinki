import { searchStops } from "@/lib/hsl/network";

export const dynamic = "force-dynamic";

// Autocomplete over HSL zone A–E stops.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json({ stops: searchStops(q, 8) });
}
