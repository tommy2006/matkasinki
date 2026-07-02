// Scout Agent — deep, multi-source web research. Accuracy-first.
// mode "discovery": rank destinations worth visiting (safety + reviews + fit).
// mode "local": generate specific, verifiable local challenges.
//
// Two paths, one contract:
//   • ANTHROPIC_API_KEY present → Claude (research model) with the server-side
//     web_search tool: browses MULTIPLE sources, reconciles conflicts, cites URLs.
//   • No key / any failure       → built-in atlas (see ./atlas.ts). Never crashes,
//     never returns an empty screen.

import { z } from "zod";
import { anthropic, MODELS } from "@/agents/shared/llm";
import type {
  DestinationCandidate,
  DiscoveryQuery,
} from "@/features/discovery/types";
import { MONTH_NAMES, rankAtlas, vibeKeyOf } from "./atlas";

export interface ScoutRequest {
  mode: "discovery" | "local";
  query: unknown;
}

/**
 * Runs a web-research loop: browse MULTIPLE sources, cross-check tourist safety and
 * real reviews, reconcile conflicting info, and cite sources. See ../README.md.
 */
export async function scout(req: ScoutRequest): Promise<unknown> {
  if (req.mode === "discovery") {
    return scoutDiscovery((req.query ?? {}) as DiscoveryQuery);
  }
  return scoutLocal(req.query);
}

/* ------------------------------------------------------------------ */
/* Discovery mode                                                      */
/* ------------------------------------------------------------------ */

export async function scoutDiscovery(
  query: DiscoveryQuery,
): Promise<DestinationCandidate[]> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const live = await discoveryViaWebResearch(query);
      if (live.length >= 3) return live;
      console.warn("[scout] live research returned too few candidates; using atlas");
    } catch (err) {
      console.error("[scout] web research failed, falling back to atlas:", err);
    }
  }
  return rankAtlas(query);
}

const CandidateSchema = z.object({
  name: z.string().min(1),
  country: z.string().optional(),
  emoji: z.string().optional(),
  tagline: z.string().optional(),
  fitScore: z.number().min(0).max(1),
  whyWorthIt: z.array(z.string()).min(1),
  bestWindow: z.string().optional(),
  estDailyBudget: z.number().nonnegative().optional(),
  safety: z.object({
    rating: z.enum(["low", "moderate", "elevated"]),
    notes: z.array(z.string()),
  }),
  reviewSummary: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()),
});

const DISCOVERY_SYSTEM = `You are Scout, the research agent inside a travel planner for people who have never been anywhere and need to know WHERE is worth going.

Method — accuracy first:
1. Run SEVERAL distinct web searches (destination shortlists for the vibe, official safety advisories, recent tourist reviews, seasonal weather/prices).
2. Cross-reference multiple sources. When sources conflict, reconcile and LOWER the confidence score rather than guessing.
3. Weigh real tourist reviews (the recurring praise AND the recurring complaints) and the actual safety picture (scams, neighbourhoods, advisories).
4. Reasons must be concrete and sourced — never marketing fluff.

Output: after researching, reply with ONLY a JSON array (no prose, no markdown fence) of 5–7 candidates matching exactly this TypeScript type:

{
  "name": string,            // "Porto, Portugal"
  "country": string,
  "emoji": string,           // flag emoji
  "tagline": string,         // one-line hook, concrete not fluffy
  "fitScore": number,        // 0..1 vs vibe + budget + season
  "whyWorthIt": string[],    // 3-4 concrete, sourced reasons
  "bestWindow": string,      // best time to go and why (weather/crowds/price)
  "estDailyBudget": number,  // USD per day for this budget band
  "safety": { "rating": "low"|"moderate"|"elevated", "notes": string[] },
  "reviewSummary": string,   // distilled from real tourist reviews, incl. honest criticism
  "confidence": number,      // 0..1 — corroboration across sources
  "sources": string[]        // URLs you actually consulted
}

Sort by fitScore descending. Safety and review sentiment must be reflected in the ranking.`;

async function discoveryViaWebResearch(
  query: DiscoveryQuery,
): Promise<DestinationCandidate[]> {
  const webSearchTool = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 10,
  };

  const parts: string[] = [
    `Traveler vibe: ${query.vibe || "explorer"}.`,
    `Budget band: ${query.budgetBand ?? "mid"}.`,
  ];
  if (query.month) parts.push(`Preferred travel month: ${MONTH_NAMES[query.month - 1]}.`);
  if (query.datesWindow) parts.push(`Dates window: ${query.datesWindow.earliest} to ${query.datesWindow.latest}.`);
  if (query.originCity) parts.push(`Origin: ${query.originCity}.`);
  if (query.maxTravelHours) parts.push(`Max travel time: ${query.maxTravelHours}h.`);
  if (query.mustHaves?.length) parts.push(`Must-haves: ${query.mustHaves.join(", ")}.`);
  if (query.dealBreakers?.length) parts.push(`Deal-breakers: ${query.dealBreakers.join(", ")}.`);
  if (query.sustainableOnly !== false) parts.push(`Prefer lower-impact, sustainable options where it doesn't hurt the fit.`);
  parts.push(`Today's date: ${new Date().toISOString().slice(0, 10)}.`);
  parts.push(`Find where this person should travel, having never been anywhere. Research thoroughly, then output the JSON array.`);

  const res = await anthropic.messages.create({
    model: MODELS.research,
    max_tokens: 8000,
    system: DISCOVERY_SYSTEM,
    tools: [webSearchTool as never],
    messages: [{ role: "user", content: parts.join("\n") }],
  });

  // Gather every text block (the JSON) and every URL Claude actually read.
  let text = "";
  const readUrls: string[] = [];
  for (const block of res.content as unknown as Array<Record<string, unknown>>) {
    if (block.type === "text" && typeof block.text === "string") text += block.text + "\n";
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content as unknown as Array<Record<string, unknown>>) {
        if (r?.type === "web_search_result" && typeof r.url === "string") readUrls.push(r.url);
      }
    }
  }

  const raw = extractJsonArray(text);
  const candidates: DestinationCandidate[] = [];
  for (const item of raw) {
    const parsed = CandidateSchema.safeParse(item);
    if (parsed.success) candidates.push(parsed.data);
  }

  // Top up sparse citations with URLs the model actually browsed.
  for (const c of candidates) {
    if (c.sources.length < 2 && readUrls.length) {
      c.sources = [...new Set([...c.sources, ...readUrls.slice(0, 3)])];
    }
  }

  return candidates.sort((a, b) => b.fitScore - a.fitScore);
}

function extractJsonArray(text: string): unknown[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end <= start) throw new Error("no JSON array in scout response");
  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("scout response was not an array");
  return parsed;
}

/* ------------------------------------------------------------------ */
/* Local mode (used by Local Guide) — lighter, same accuracy rules     */
/* ------------------------------------------------------------------ */

export interface LocalChallenge {
  id: string;
  title: string;
  description: string;
  category: string;      // food | landmark | hidden-gem | culture | nature
  estCost: number;       // USD
  sustainable: boolean;
  verifyHint: string;    // how the Verifier can check it (geo / photo / receipt)
  sources: string[];
}

const LocalChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  estCost: z.number(),
  sustainable: z.boolean(),
  verifyHint: z.string(),
  sources: z.array(z.string()),
});

async function scoutLocal(query: unknown): Promise<LocalChallenge[]> {
  const q = (query ?? {}) as { destination?: string; vibe?: string; difficulty?: string; budget?: number };
  const destination = q.destination || "the destination";

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await anthropic.messages.create({
        model: MODELS.research,
        max_tokens: 4000,
        system:
          "You are Scout researching real, current local experiences (restaurants, hidden gems, landmarks, local dishes) via web search. Cross-check reviews and safety. Reply with ONLY a JSON array of challenge objects: { id, title, description, category, estCost (USD number), sustainable (boolean), verifyHint, sources (URLs read) }.",
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 } as never],
        messages: [
          {
            role: "user",
            content: `Destination: ${destination}. Vibe: ${q.vibe ?? "explorer"}. Difficulty: ${q.difficulty ?? "standard"}. Budget: ${q.budget ?? "moderate"}. Suggest 5-6 verifiable local challenges.`,
          },
        ],
      });
      let text = "";
      for (const block of res.content as unknown as Array<Record<string, unknown>>) {
        if (block.type === "text" && typeof block.text === "string") text += block.text + "\n";
      }
      const items = extractJsonArray(text)
        .map((i) => LocalChallengeSchema.safeParse(i))
        .filter((p) => p.success)
        .map((p) => p.data!);
      if (items.length >= 3) return items;
    } catch (err) {
      console.error("[scout] local research failed, using template challenges:", err);
    }
  }

  const city = destination.split(",")[0].trim();
  return [
    {
      id: "market-breakfast",
      title: `Breakfast where ${city} shops`,
      description: `Find the main covered or morning market in ${city} and eat what the vendors themselves are eating — no tourist-menu restaurants allowed.`,
      category: "food",
      estCost: 8,
      sustainable: true,
      verifyHint: "Budget Tracker receipt near the market location, or geotagged photo",
      sources: [`https://en.wikivoyage.org/wiki/${encodeURIComponent(city.replace(/ /g, "_"))}`],
    },
    {
      id: "highest-viewpoint",
      title: "Earn the skyline",
      description: `Reach ${city}'s best free viewpoint on foot (tower, hill or rooftop) and stay for one full sunset.`,
      category: "landmark",
      estCost: 0,
      sustainable: true,
      verifyHint: "Geolocation check at the viewpoint after 5pm local time",
      sources: [`https://en.wikivoyage.org/wiki/${encodeURIComponent(city.replace(/ /g, "_"))}`],
    },
    {
      id: "local-dish",
      title: "Order the dish the city is named for",
      description: `Every city has one plate locals argue about. Find ${city}'s, order it where locals queue, and learn its name in the local language.`,
      category: "food",
      estCost: 12,
      sustainable: true,
      verifyHint: "Photo of the dish + matching receipt",
      sources: ["https://www.tasteatlas.com/"],
    },
    {
      id: "no-map-hour",
      title: "One hour, no map",
      description: `Put the phone away and walk one hour through ${city}'s old quarter. Bring back the name of one street, one shop and one thing you'd never have found otherwise.`,
      category: "hidden-gem",
      estCost: 0,
      sustainable: true,
      verifyHint: "Geolocation trail within the historic centre",
      sources: [`https://en.wikivoyage.org/wiki/${encodeURIComponent(city.replace(/ /g, "_"))}`],
    },
    {
      id: "craft-souvenir",
      title: "Buy the thing that is actually made here",
      description: `Skip the airport fridge magnets: find a workshop or independent maker in ${city} and buy one thing produced in the city itself.`,
      category: "culture",
      estCost: 20,
      sustainable: true,
      verifyHint: "Receipt from an independent local shop",
      sources: ["https://www.atlasobscura.com/"],
    },
  ];
}
