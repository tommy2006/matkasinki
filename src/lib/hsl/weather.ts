// Live Helsinki weather from Open-Meteo (https://open-meteo.com) — free, no API
// key. It decides the best mode of transport for the day: when it's wet/snowy we
// prefer trains, the metro and buses (covered) and penalise walking and ferries.
//
// No file reads/writes here, so it works on Vercel's read-only filesystem. The
// manual weather toggle sets an in-memory override (per server instance; live
// weather is always the default).

import type { Mode, TransportPreference, WeatherInfo } from "./types";

const HELSINKI = { lat: 60.17, lon: 24.94 };
const OPEN_METEO =
  `https://api.open-meteo.com/v1/forecast?latitude=${HELSINKI.lat}&longitude=${HELSINKI.lon}` +
  `&current=temperature_2m,precipitation,rain,snowfall,weather_code,wind_speed_10m&timezone=Europe%2FHelsinki`;

export type Condition = "clear" | "clouds" | "rain" | "snow";

/* ---------------- manual override (demo toggle) ---------------- */
// Stored on globalThis so the override is shared across every API route in one
// process — Next bundles each route separately, so a plain module-level variable
// would not be seen from another route. (Per-instance on serverless; live weather
// is always the default.)
const weatherState = globalThis as unknown as { __weatherOverride?: WeatherInfo | null };

const PRESETS: Record<Condition, Omit<WeatherInfo, "date">> = {
  clear: { condition: "clear", tempC: 19, precipitationMm: 0, windKmh: 9, summary: "Clear skies over Helsinki" },
  clouds: { condition: "clouds", tempC: 15, precipitationMm: 0, windKmh: 14, summary: "Overcast but dry" },
  rain: { condition: "rain", tempC: 14, precipitationMm: 4.2, windKmh: 18, summary: "Rain across the region" },
  snow: { condition: "snow", tempC: -3, precipitationMm: 3.0, windKmh: 22, summary: "Snow showers across the region" },
};

export function setWeatherOverride(condition: Condition): WeatherInfo {
  const w = { date: new Date().toISOString().slice(0, 10), ...PRESETS[condition] };
  weatherState.__weatherOverride = w;
  return w;
}
export function clearWeatherOverride(): void {
  weatherState.__weatherOverride = null;
}

/* ---------------- WMO weather-code mapping ---------------- */
function conditionFromCode(code: number, snowfall: number, precip: number): Condition {
  if (snowfall > 0 || (code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 || precip > 0.2) return "rain";
  if (code >= 1 && code <= 48) return "clouds";
  return "clear";
}
function describe(condition: Condition): string {
  return { clear: "Clear", clouds: "Cloudy", rain: "Rain", snow: "Snow" }[condition] + " in Helsinki";
}

/* ---------------- live weather ---------------- */
export async function loadWeather(): Promise<WeatherInfo> {
  if (weatherState.__weatherOverride) return weatherState.__weatherOverride;
  try {
    const res = await fetch(OPEN_METEO, { next: { revalidate: 600 } }); // cache 10 min
    if (!res.ok) throw new Error(`weather service ${res.status}`);
    const c = (await res.json()).current ?? {};
    const condition = conditionFromCode(c.weather_code ?? 0, c.snowfall ?? 0, c.precipitation ?? 0);
    const tempC = Math.round(c.temperature_2m ?? 15);
    return {
      date: new Date().toISOString().slice(0, 10),
      condition,
      tempC,
      precipitationMm: c.precipitation ?? 0,
      windKmh: Math.round(c.wind_speed_10m ?? 0),
      summary: describe(condition),
    };
  } catch {
    // Human-understandable fallback — never crash the route planner.
    return {
      date: new Date().toISOString().slice(0, 10),
      condition: "clear",
      tempC: 15,
      precipitationMm: 0,
      windKmh: 0,
      summary: "Live weather is unavailable right now — routing without a rain preference.",
    };
  }
}

export function transportPreference(w: WeatherInfo): TransportPreference {
  const wet = w.condition === "rain" || w.condition === "snow" || w.precipitationMm > 0.5;
  if (wet) {
    const preferredModes: Mode[] = ["RAIL", "SUBWAY", "BUS", "TRAM"];
    return {
      rain: true,
      preferredModes,
      avoid: ["WALK", "FERRY"],
      message:
        `It's ${w.condition === "snow" ? "snowing" : "raining"} in the HSL region today (${w.summary || `${w.precipitationMm} mm`}, ${w.tempC}°C). ` +
        `Your route now prefers trains, the metro and buses to keep you covered, and minimises walking and ferry legs so you stay dry.`,
    };
  }
  return {
    rain: false,
    preferredModes: ["SUBWAY", "TRAM", "RAIL", "BUS", "FERRY"],
    avoid: [],
    message:
      `${w.summary?.startsWith("Live weather is unavailable") ? w.summary : `It's dry in the HSL region today (${w.summary || "clear"}, ${w.tempC}°C).`} ` +
      `No rain penalty applied — the fastest mix of HSL vehicles and short walks is used.`,
  };
}
