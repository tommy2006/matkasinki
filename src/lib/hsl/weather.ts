// Weather comes from a dummy JSON input (src/data/weather.json). It decides the
// best mode of transport for the day: when it's raining we prefer trains, the
// metro and buses (covered) and penalise walking and ferries — and tell the user.

import fs from "node:fs";
import path from "node:path";
import type { Mode, TransportPreference, WeatherInfo } from "./types";

export function loadWeather(): WeatherInfo {
  const p = path.join(process.cwd(), "src", "data", "weather.json");
  try {
    const w = JSON.parse(fs.readFileSync(p, "utf8")) as Partial<WeatherInfo>;
    return {
      date: w.date ?? new Date().toISOString().slice(0, 10),
      condition: (w.condition ?? "clear").toLowerCase(),
      tempC: w.tempC ?? 15,
      precipitationMm: w.precipitationMm ?? 0,
      windKmh: w.windKmh ?? 0,
      summary: w.summary ?? "",
    };
  } catch {
    return { date: new Date().toISOString().slice(0, 10), condition: "clear", tempC: 15, precipitationMm: 0, windKmh: 0, summary: "No weather data" };
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
      `It's dry in the HSL region today (${w.summary || "clear"}, ${w.tempC}°C). ` +
      `No rain penalty applied — the fastest mix of HSL vehicles and short walks is used.`,
  };
}
