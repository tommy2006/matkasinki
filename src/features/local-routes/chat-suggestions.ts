export const CHAT_SUGGESTIONS = [
  {
    id: "weekend-three-day",
    prompt: "Plan a three-day Helsinki itinerary",
  },
  {
    id: "museum-punavuori",
    prompt: "Plan a Helsinki trip with museums",
  },
  {
    id: "keskusta-classics",
    prompt: "Plan a classic day around Senate Square and the market",
  },
  {
    id: "rock-kaivopuisto",
    prompt: "Plan a Helsinki day with the Rock Church and seaside",
  },
  {
    id: "hakaniemi-food",
    prompt: "Plan a food day in Hakaniemi and Kallio",
  },
  {
    id: "suomenlinna",
    prompt: "Plan a Suomenlinna ferry day from Helsinki",
  },
] as const;

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function isPredefinedSuggestion(prompt: string): boolean {
  const p = normalize(prompt);
  return CHAT_SUGGESTIONS.some((s) => normalize(s.prompt) === p);
}

export function isDemoMode(): boolean {
  return process.env.MATKASINKI_LIVE_AGENT !== "1";
}

export function useLiveRouteAgent(): boolean {
  return !isDemoMode() && Boolean(process.env.ANTHROPIC_API_KEY);
}
