// Weather endpoint. GET returns the live Helsinki weather (Open-Meteo, via the
// shared loader). POST sets a manual override for the demo toggle — kept in
// memory only (no file writes, so it works on Vercel's read-only filesystem).
// POST { condition: "live" } clears the override and returns live weather again.

import { type Condition, clearWeatherOverride, loadWeather, setWeatherOverride } from "@/lib/hsl/weather";

export const dynamic = "force-dynamic";

const CONDITIONS: readonly Condition[] = ["clear", "clouds", "rain", "snow"];

export async function GET() {
  return Response.json(await loadWeather());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { condition?: string };
  const condition = body.condition;

  if (condition === "live") {
    clearWeatherOverride();
    return Response.json(await loadWeather());
  }
  if (!condition || !CONDITIONS.includes(condition as Condition)) {
    return Response.json(
      { error: "Invalid condition. Expected one of: clear, clouds, rain, snow (or 'live' to use real weather)." },
      { status: 400 },
    );
  }
  return Response.json(setWeatherOverride(condition as Condition));
}
