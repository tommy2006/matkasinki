// Local Guide — live, web-sourced challenges for a place the user doesn't know.
// Uses the Scout Agent when ANTHROPIC_API_KEY is set; otherwise the rich built-in
// sets. Completion is VERIFIED (anti-cheese) by the Verifier. Sustainability-first
// by default. Rewards unlock leagues, friendlies, players, and coaching staff.

import { scout, type LocalChallenge } from "@/agents/scout";
import { BUILTIN_SETS, genericSet, guessCountryCode } from "./builtin";

export interface Challenge {
  id: string;
  title: string;
  description?: string;
  placeId: string;
  difficulty: "easy" | "medium" | "hard";
  sustainable: boolean;
  reward: { kind: "player" | "staff" | "league" | "fixture"; ref: string };
  sources: string[];
}

const REWARD_KINDS: Challenge["reward"]["kind"][] = ["player", "staff", "fixture", "league"];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Built-in path: map a destination's seed set to full Challenge objects. */
function builtinChallenges(location: string): Challenge[] {
  const cc = guessCountryCode(location);
  const key = slug(location.split(",")[0]);
  const seeds = BUILTIN_SETS[key] ?? BUILTIN_SETS[cc] ?? genericSet(location);
  const placeId = slug(location);
  return seeds.map((s, i) => ({
    ...s,
    id: `${placeId}-${i}`,
    placeId,
    reward: s.reward ?? { kind: REWARD_KINDS[i % REWARD_KINDS.length], ref: cc },
  }));
}

/** Live path: convert Scout's LocalChallenge[] to Challenge[]. */
function fromScout(location: string, items: LocalChallenge[]): Challenge[] {
  const cc = guessCountryCode(location);
  const placeId = slug(location);
  const diffFor = (cost: number): Challenge["difficulty"] =>
    cost > 60 ? "hard" : cost > 20 ? "medium" : "easy";
  return items.map((it, i) => ({
    id: `${placeId}-${slug(it.id || it.title)}-${i}`,
    title: it.title,
    description: it.description,
    placeId,
    difficulty: diffFor(it.estCost ?? 0),
    sustainable: !!it.sustainable,
    reward: { kind: REWARD_KINDS[i % REWARD_KINDS.length], ref: cc },
    sources: it.sources ?? [],
  }));
}

export async function suggestChallenges(args: {
  location: string;
  vibe?: string;
  difficulty?: string;
  budget?: number;
  sustainableOnly?: boolean;
}): Promise<Challenge[]> {
  const { location, sustainableOnly = true } = args;
  let list: Challenge[];

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const items = (await scout({ mode: "local", query: args })) as LocalChallenge[];
      list = Array.isArray(items) && items.length ? fromScout(location, items) : builtinChallenges(location);
    } catch {
      list = builtinChallenges(location);
    }
  } else {
    list = builtinChallenges(location);
  }

  // Sustainability-first: when the setting is on, sustainable challenges float up.
  if (sustainableOnly) {
    list = [...list].sort((a, b) => Number(b.sustainable) - Number(a.sustainable));
  }
  return list;
}
