import type { LocalRoutePlan } from "./types";

/**
 * Follow-up prompts are derived from the saved plan rather than asked of the
 * model, so suggesting them costs nothing. They are phrased as instructions the
 * user can send as-is.
 */
export function followUpSuggestions(plan: LocalRoutePlan | null): string[] {
  if (!plan) return [];

  const dayNumbers = [...new Set(plan.stops.map((s) => s.day || 1))].sort((a, b) => a - b);
  const multiDay = dayNumbers.length > 1;
  const categories = new Set(plan.stops.map((s) => s.category?.toLowerCase()).filter(Boolean));
  const hasFood = categories.has("restaurant") || categories.has("bar") || categories.has("cafe");
  const hasMuseum = categories.has("museum");
  const longestDay = dayNumbers
    .map((d) => ({ day: d, count: plan.stops.filter((s) => (s.day || 1) === d).length }))
    .sort((a, b) => b.count - a.count)[0];

  const out: string[] = [];

  if (multiDay && longestDay) {
    out.push(`Make day ${longestDay.day} lighter — one less stop`);
    out.push(`Swap day ${dayNumbers[dayNumbers.length - 1]} for something outdoors`);
  } else {
    out.push("Add one more stop in the afternoon");
    out.push("Make this a two-day trip instead");
  }

  out.push("What if it rains? Give me indoor backups");

  if (hasFood) out.push("Suggest cheaper places to eat");
  else out.push("Add a good lunch stop");

  if (hasMuseum) out.push("Which of these need tickets booked ahead?");
  out.push("Start an hour later and end earlier");

  return out.slice(0, 5);
}
