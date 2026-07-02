// Trip Planner — chosen destination -> real, followable itinerary.
// Core is a genuine planner; introvert/low-effort input (defaults, "surprise me").
// Deterministic, offline-capable: builds days from the built-in atlas packs, biased
// to the user's vibe. planDay() powers per-day "swap" without rebuilding the trip.

import { packFor, type PlanPack, type PoolItem } from "./atlas";
import { vibeKeyOf, type VibeKey } from "@/agents/scout/atlas";

export interface TripPlanInput {
  destination: string; // handed over from discovery
  dates: { start: string; end: string };
  budget?: number;
  vibe: string;
}

export interface ItineraryItem {
  time?: string;
  title: string;
  notes?: string;
}

export interface ItineraryDay {
  date: string;
  theme?: string;
  items: ItineraryItem[];
}

const SLOTS: { key: keyof Pick<PlanPack, "morning" | "afternoon" | "evening">; time: string }[] = [
  { key: "morning", time: "09:30" },
  { key: "afternoon", time: "14:00" },
  { key: "evening", time: "19:30" },
];

/** Deterministic, vibe-biased pick from a pool. `salt` rotates picks for day-swaps. */
function pick(pool: PoolItem[], vibe: VibeKey, dayIndex: number, slot: number, salt: number): PoolItem {
  const preferred = pool.filter((p) => p.tags.includes(vibe));
  const list = preferred.length > 0 ? preferred : pool;
  const idx = (dayIndex * 3 + slot + salt) % list.length;
  return list[idx];
}

function dateList(start: string, end: string): string[] {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime())) return [new Date().toISOString().slice(0, 10)];
  const out: string[] = [];
  const cur = new Date(s);
  const last = isNaN(e.getTime()) || e < s ? s : e;
  while (cur <= last && out.length < 10) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out.length ? out : [s.toISOString().slice(0, 10)];
}

/** Build a single day (used for both full plans and swap-regeneration). */
export function planDay(input: TripPlanInput, date: string, dayIndex: number, salt = 0): ItineraryDay {
  const { pack } = packFor(input.destination);
  const vibe = vibeKeyOf(input.vibe);
  const theme = pack.themes[(dayIndex + salt) % pack.themes.length];
  const items: ItineraryItem[] = SLOTS.map((slot, i) => {
    const choice = pick(pack[slot.key], vibe, dayIndex, i, salt);
    return { time: slot.time, title: choice.title, notes: choice.notes };
  });
  return { date, theme, items };
}

export async function planTrip(input: TripPlanInput): Promise<ItineraryDay[]> {
  const dates = dateList(input.dates.start, input.dates.end);
  return dates.map((date, i) => planDay(input, date, i));
}
