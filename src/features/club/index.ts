// Football layer — consumes VERIFIED travel events only. Never gates travel tools.
//
// This module is CLIENT-SAFE (no fs / db imports). The heavy, server-only
// derivation lives in ./derive (deriveClub) which reads the football database.
//
// Core design (§16): club state is a PURE, DETERMINISTIC function of the
// travel event log. Unverified events grant nothing. Rewards are capped per
// location so same-spot farming doesn't pay.

import type { TravelEvent } from "@/lib/store";

export type { TravelEvent };

// Touristy cup ladder, low -> high prestige (§14). Top two are the big ones.
export const LEAGUES = [
  "Check-In Cup",
  "Lounge Cup",
  "Terminal Cup",
  "Airport Cup",
  "Airport Champions League",
] as const;

export type LeagueName = (typeof LEAGUES)[number];

/** Verified challenges required to REACH each tier (index-aligned with LEAGUES). */
export const TIER_THRESHOLDS = [0, 3, 7, 12, 20] as const;

/** Max granted challenge rewards per location key (anti same-location farming, §16). */
export const MAX_REWARDS_PER_LOCATION = 4;

/** Tier index (0-4) for a count of verified challenges. */
export function tierForVerifiedCount(verified: number): number {
  let tier = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (verified >= TIER_THRESHOLDS[i]) tier = i;
  }
  return tier;
}

/** Progress toward the next tier: [have, need] — need = 0 means max tier. */
export function progressToNextTier(verified: number): { have: number; need: number; nextTier: number | null } {
  const tier = tierForVerifiedCount(verified);
  if (tier >= TIER_THRESHOLDS.length - 1) return { have: verified, need: 0, nextTier: null };
  return { have: verified, need: TIER_THRESHOLDS[tier + 1], nextTier: tier + 1 };
}

/* ---------------- deterministic helpers (shared by derive + engine + rivals) ---------------- */

/** FNV-1a 32-bit string hash — stable seed source for reward rolls. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 seeded PRNG — returns a () => [0,1) function. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${Math.round(n)}`;
}

/** Human label for a DB position code (GK, DC, ST, ...). */
export function positionLabel(code: string): string {
  const map: Record<string, string> = {
    GK: "Goalkeeper", DL: "Left back", DC: "Centre back", DR: "Right back",
    WBL: "Wing back (L)", WBR: "Wing back (R)", DM: "Defensive mid",
    ML: "Left mid", MC: "Central mid", MR: "Right mid",
    AML: "Left winger", AMC: "Attacking mid", AMR: "Right winger", ST: "Striker",
  };
  return map[code] ?? code;
}

/* ---------------- reward ledger types (rendered by /club) ---------------- */

export interface RewardEntry {
  eventKey: string;
  kind: TravelEvent["kind"];
  at: string;
  verified: boolean;
  /** false when unverified or capped — no reward applied. */
  granted: boolean;
  summary: string;
}

/** Squad entry enriched with market data straight from the football DB. */
export interface DerivedPlayer extends SquadPlayerBase {
  value?: number; // market value from the DB (absent for legacy/persisted entries)
  potential?: number; // potential_ability from the DB
}

type SquadPlayerBase = import("@/lib/store").SquadPlayer;

export interface DerivedClub {
  squad: DerivedPlayer[];
  staff: import("@/lib/store").StaffMember[];
  leagueTier: number;
  transferBudget: number;
  morale: number;
  verifiedChallenges: number;
  verifiedPlaces: number;
  rewards: RewardEntry[];
}

/**
 * Travel core -> football layer entry point. The event is appended to the
 * shared store; club state itself is DERIVED from the log at read time
 * (see ./derive), so this never hands out rewards directly — anti-cheese
 * lives in one place. Server-side only (dynamic import keeps this module
 * client-safe).
 */
type WithOptionalAt<T> = T extends { at: string } ? Omit<T, "at"> & { at?: string } : never;

export async function applyTravelEvent(e: WithOptionalAt<TravelEvent>): Promise<void> {
  const { updateState } = await import("@/lib/store");
  const at = e.at ?? new Date().toISOString();
  updateState((s) => {
    s.events.push({ ...e, at } as TravelEvent);
  });
}
