import type { LocalRoutePlan } from "./types";

export function demoHelsinkiRoute(prompt = "Demo Helsinki day"): LocalRoutePlan {
  const now = new Date().toISOString();
  return {
    id: "demo-helsinki",
    prompt,
    title: "Helsinki highlights (demo)",
    summary:
      "Senate Square → Ateneum → Esplanadi → Ravintola Nokka. Static demo when API keys are missing.",
    origin: { lat: 60.1699, lon: 24.9384 },
    stops: [
      { order: 1, name: "Senate Square", lat: 60.1695, lon: 24.9524, category: "sight", dwellMinutes: 0 },
      { order: 2, name: "Ateneum Art Museum", lat: 60.1698, lon: 24.9435, category: "museum", dwellMinutes: 60 },
      { order: 3, name: "Esplanadi Park", lat: 60.1674, lon: 24.9447, category: "sight", dwellMinutes: 30 },
      { order: 4, name: "Ravintola Nokka", lat: 60.1767, lon: 24.9772, category: "restaurant", dwellMinutes: 90 },
    ],
    legs: [
      {
        mode: "WALK",
        durationSeconds: 480,
        distanceMeters: 400,
        fromName: "Senate Square",
        toName: "Helsinki Cathedral tram stop",
        instruction: "Walk 8 min to Senate Square tram stop",
        polyline: [
          [24.9524, 60.1695],
          [24.949, 60.1696],
          [24.945, 60.1698],
        ],
      },
      {
        mode: "TRAM",
        durationSeconds: 360,
        fromName: "Senate Square",
        toName: "Ateneum",
        line: "3",
        headsign: "Eira",
        instruction: "Take Tram 3 toward Eira (6 min): Senate Square → Ateneum",
        polyline: [
          [24.945, 60.1698],
          [24.944, 60.1698],
          [24.9435, 60.1698],
        ],
      },
      {
        mode: "WALK",
        durationSeconds: 300,
        fromName: "Ateneum",
        toName: "Esplanadi Park",
        instruction: "Walk 5 min through the park to Esplanadi",
        polyline: [
          [24.9435, 60.1698],
          [24.944, 60.1685],
          [24.9447, 60.1674],
        ],
      },
      {
        mode: "TRAM",
        durationSeconds: 720,
        fromName: "Esplanadi",
        toName: "Kallio",
        line: "7",
        headsign: "Hakaniemi",
        instruction: "Take Tram 7 (12 min) toward Hakaniemi, then walk to Nokka",
        polyline: [
          [24.9447, 60.1674],
          [24.955, 60.17],
          [24.968, 60.174],
          [24.9772, 60.1767],
        ],
      },
    ],
    savedAt: now,
    demo: true,
  };
}
