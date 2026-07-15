// Pure types shared between the routing engine (server) and the UI (client).
// No fs/imports here so client components can `import type` freely.

export type Mode = "SUBWAY" | "RAIL" | "TRAM" | "BUS" | "FERRY" | "WALK" | "TAXI";

export interface StopLite {
  id: string;
  name: string;
  code: string | null;
  zone: string | null;
  mode: string | null;
  lat: number;
  lon: number;
}

export interface JourneyLeg {
  kind: "ride" | "walk";
  mode: Mode;
  routeShortName?: string | null;
  routeLongName?: string | null;
  color?: string | null;
  from: StopLite;
  to: StopLite;
  numStops?: number; // ride: number of stops travelled
  walkMeters?: number; // walk leg length
  seconds: number;
  path: [number, number][]; // [lat, lon] polyline for this leg
}

export interface JourneySegment {
  fromName: string;
  toName: string;
  legs: JourneyLeg[];
  seconds: number;
}

export interface WeatherInfo {
  date: string;
  condition: string;
  tempC: number;
  precipitationMm: number;
  windKmh: number;
  summary: string;
}

export interface TransportPreference {
  rain: boolean;
  preferredModes: Mode[];
  avoid: Mode[];
  message: string;
}

export interface JourneyResult {
  ok: boolean;
  error?: string;
  destinations: StopLite[];
  segments: JourneySegment[];
  totalSeconds: number;
  weather: WeatherInfo;
  preference: TransportPreference;
  bounds?: [[number, number], [number, number]]; // [[minLat,minLon],[maxLat,maxLon]]
}
