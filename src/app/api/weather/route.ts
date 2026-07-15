import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type Condition = "clear" | "clouds" | "rain" | "snow";

const WEATHER_PATH = path.join(process.cwd(), "src", "data", "weather.json");

const PRESETS: Record<Condition, { tempC: number; precipitationMm: number; windKmh: number; summary: string }> = {
  clear: { tempC: 19, precipitationMm: 0, windKmh: 9, summary: "Clear skies over Helsinki" },
  clouds: { tempC: 15, precipitationMm: 0, windKmh: 14, summary: "Overcast but dry" },
  rain: { tempC: 14, precipitationMm: 4.2, windKmh: 18, summary: "Steady rain through the afternoon" },
  snow: { tempC: -3, precipitationMm: 3.0, windKmh: 22, summary: "Snow showers across the region" },
};

const CONDITIONS: Condition[] = ["clear", "clouds", "rain", "snow"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildWeather(condition: Condition) {
  const p = PRESETS[condition];
  return {
    date: today(),
    condition,
    tempC: p.tempC,
    precipitationMm: p.precipitationMm,
    windKmh: p.windKmh,
    summary: p.summary,
  };
}

export async function GET() {
  try {
    const raw = fs.readFileSync(WEATHER_PATH, "utf8");
    return Response.json(JSON.parse(raw));
  } catch {
    return Response.json(buildWeather("clear"));
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { condition?: string };
  const condition = body.condition as Condition;

  if (!condition || !CONDITIONS.includes(condition)) {
    return Response.json(
      { error: "Invalid condition. Expected one of: clear, clouds, rain, snow." },
      { status: 400 },
    );
  }

  const weather = buildWeather(condition);

  try {
    fs.writeFileSync(WEATHER_PATH, JSON.stringify(weather, null, 2) + "\n", "utf8");
  } catch {
    return Response.json({ error: "Could not persist weather." }, { status: 500 });
  }

  return Response.json(weather);
}
