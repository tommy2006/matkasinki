// SERVER-ONLY: derives the club deterministically from the travel event log.
// Reads real players from the open-football-database via @/lib/db (fs-backed).
//
// deriveClub(events, profile) is PURE for a fixed database: same event log in,
// same club out. There is no "grant reward" write path anywhere — the only way
// to grow the club is to append VERIFIED events to the travel log (§16).

import fs from "node:fs";
import path from "node:path";
import {
  getCountries,
  getCountryByCode,
  getPlayableCountryCodes,
  scoutPlayersFromCountry,
  isDbAvailable,
  type DbPlayer,
} from "@/lib/db";
import type { AppState, SquadPlayer, StaffMember, TravelEvent } from "@/lib/store";
import {
  hashString,
  tierForVerifiedCount,
  MAX_REWARDS_PER_LOCATION,
  type DerivedClub,
  type DerivedPlayer,
  type RewardEntry,
} from "./index";

/* ---------------- location + country inference ---------------- */

// Curated rotation of playable countries so rewards feel worldly even when the
// event id carries no location hint. Filtered against what's on disk.
const ROTATION = [
  "pt", "es", "it", "fr", "de", "nl", "gb", "br", "ar", "jp",
  "us", "tr", "gr", "hr", "ma", "mx", "dk", "be", "at", "ch",
];

// Well-known destination keywords -> country code (flavor: a challenge id like
// "porto-francesinha-hunt" scouts a Portuguese player).
const CITY_HINTS: Record<string, string> = {
  porto: "pt", lisbon: "pt", lisboa: "pt", algarve: "pt",
  barcelona: "es", madrid: "es", seville: "es", sevilla: "es", valencia: "es",
  rome: "it", roma: "it", milan: "it", venice: "it", florence: "it", naples: "it",
  paris: "fr", lyon: "fr", nice: "fr", marseille: "fr",
  berlin: "de", munich: "de", hamburg: "de", cologne: "de",
  amsterdam: "nl", rotterdam: "nl",
  london: "gb", manchester: "gb", edinburgh: "gb", liverpool: "gb",
  tokyo: "jp", kyoto: "jp", osaka: "jp",
  rio: "br", "sao-paulo": "br", saopaulo: "br",
  "buenos-aires": "ar", buenosaires: "ar",
  istanbul: "tr", athens: "gr", santorini: "gr", dubrovnik: "hr", split: "hr",
  marrakech: "ma", casablanca: "ma", "mexico-city": "mx", cancun: "mx",
  copenhagen: "dk", brussels: "be", bruges: "be", vienna: "at", zurich: "ch",
  "new-york": "us", newyork: "us", miami: "us", prague: "cz", budapest: "hu",
  warsaw: "pl", krakow: "pl", stockholm: "se", oslo: "no", helsinki: "fi",
  dublin: "gb", cairo: "eg", "cape-town": "za", capetown: "za", sydney: "au",
  melbourne: "au", auckland: "nz", bali: "id", jakarta: "id", lima: "pe",
  santiago: "cl", bogota: "co", montevideo: "uy",
};

interface Loc {
  code: string; // playable country code
  label: string; // "Porto, Portugal" | "Portugal"
  key: string; // farming-cap bucket
}

function inferLocation(eventId: string, seed: number, playable: Set<string>): Loc {
  const id = eventId.toLowerCase();
  const tokens = id.split(/[^a-z]+/).filter(Boolean);

  // 1. explicit city keyword anywhere in the id
  for (const [city, code] of Object.entries(CITY_HINTS)) {
    if (id.includes(city) && playable.has(code)) {
      const cityName = city.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
      const country = getCountryByCode(code)?.name ?? code.toUpperCase();
      return { code, label: `${cityName}, ${country}`, key: city };
    }
  }
  // 2. a bare 2-letter playable country code token ("pt", "jp", ...)
  for (const t of tokens) {
    if (t.length === 2 && playable.has(t)) {
      const country = getCountryByCode(t)?.name ?? t.toUpperCase();
      return { code: t, label: country, key: t };
    }
  }
  // 3. deterministic rotation through playable countries
  const pool = ROTATION.filter((c) => playable.has(c));
  const list = pool.length > 0 ? pool : [...playable];
  const code = list.length > 0 ? list[seed % list.length] : "pt";
  const country = getCountryByCode(code)?.name ?? code.toUpperCase();
  // no location hint -> bucket by the event id itself (cap can't bite wrongly)
  return { code, label: country, key: `id:${eventId}` };
}

/* ---------------- staff generation (real regional names) ---------------- */

const STAFF_ROLES = ["Physio", "Scout", "Analyst", "Coach"] as const;
const FALLBACK_FIRST = ["Alex", "Jonas", "Marco", "Sam", "Nico", "Theo", "Iker", "Lukas"];
const FALLBACK_LAST = ["Berg", "Costa", "Nakamura", "Weiss", "Moreau", "Silva", "Novak", "Petit"];

function readNames(countryCode: string): { first: string[]; last: string[] } {
  try {
    const p = path.join(
      process.cwd(), "data", "open-football-database", "data", countryCode, "names.json",
    );
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as {
      first_names?: string[]; last_names?: string[];
    };
    if (raw.first_names?.length && raw.last_names?.length) {
      return { first: raw.first_names, last: raw.last_names };
    }
  } catch {
    /* fall through */
  }
  return { first: FALLBACK_FIRST, last: FALLBACK_LAST };
}

/* ---------------- the derivation ---------------- */

function bestPosition(p: DbPlayer): string {
  if (!p.positions || p.positions.length === 0) return "MC";
  return [...p.positions].sort((a, b) => b.level - a.level)[0].code;
}

function toSquadPlayer(p: DbPlayer, scoutedIn: string): DerivedPlayer {
  return {
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    position: bestPosition(p),
    ability: p.current_ability,
    scoutedIn,
    value: p.value,
    potential: p.potential_ability,
  };
}

const BASE_BUDGET = 1_000_000;
const CHALLENGE_APPEARANCE_FEE = 50_000;

/**
 * Deterministically convert the travel event log into club state.
 * - VERIFIED challenge_completed -> real scouted player(s) (~70%) or staff (~30%),
 *   seeded by hash(challengeId); country inferred from the id or rotated.
 * - budget_kept -> sponsorship: underBy x1000 transfer funds.
 * - activity_done -> morale (training sessions).
 * - place_visited (verified) -> small morale bump, counts toward places.
 * - UNVERIFIED events -> nothing (surfaced greyed-out in the ledger).
 * - Max MAX_REWARDS_PER_LOCATION granted challenge rewards per location key.
 */
export function deriveClub(events: TravelEvent[], profile?: AppState["profile"]): DerivedClub {
  const playable = new Set(isDbAvailable() ? getPlayableCountryCodes() : []);
  const squad: DerivedPlayer[] = [];
  const staff: StaffMember[] = [];
  const rewards: RewardEntry[] = [];
  const seenPlayerIds = new Set<number>();
  const perLocation = new Map<string, number>();
  const seenPlaceIds = new Set<string>();

  // A settled club identity (from onboarding) starts slightly higher on morale.
  let morale = profile ? 58 : 55;
  let budgetBumps = 0;
  let verifiedChallenges = 0;
  let verifiedPlaces = 0;

  const sorted = [...events].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  for (const e of sorted) {
    switch (e.kind) {
      case "challenge_completed": {
        if (!e.verified) {
          rewards.push({
            eventKey: e.challengeId, kind: e.kind, at: e.at, verified: false, granted: false,
            summary: `Challenge "${e.challengeId}" — unverified, no reward`,
          });
          break;
        }
        verifiedChallenges++;
        const seed = hashString(e.challengeId);
        const loc = inferLocation(e.challengeId, seed, playable);
        const used = perLocation.get(loc.key) ?? 0;
        if (used >= MAX_REWARDS_PER_LOCATION) {
          rewards.push({
            eventKey: e.challengeId, kind: e.kind, at: e.at, verified: true, granted: false,
            summary: `Challenge verified, but scouting network is tapped out in ${loc.label} — explore somewhere new`,
          });
          break;
        }
        perLocation.set(loc.key, used + 1);
        morale = Math.min(99, morale + 2);

        const roll = seed % 100;
        if (roll < 70 || !playable.has(loc.code)) {
          // scout 1-2 real players from the inferred country
          const n = 1 + ((seed >>> 4) % 2);
          let found = scoutPlayersFromCountry(loc.code, n + 2, (seed >>> 8) % 1000);
          if (found.length === 0 && playable.size > 0) {
            found = scoutPlayersFromCountry("pt", n + 2, (seed >>> 8) % 1000);
          }
          const fresh = found.filter((p) => !seenPlayerIds.has(p.id)).slice(0, n);
          if (fresh.length === 0) {
            rewards.push({
              eventKey: e.challengeId, kind: e.kind, at: e.at, verified: true, granted: true,
              summary: `Scouting trip in ${loc.label} — no new signings, +${CHALLENGE_APPEARANCE_FEE / 1000}k appearance fee`,
            });
            break;
          }
          for (const p of fresh) {
            seenPlayerIds.add(p.id);
            squad.push(toSquadPlayer(p, loc.label));
          }
          rewards.push({
            eventKey: e.challengeId, kind: e.kind, at: e.at, verified: true, granted: true,
            summary: `Scouted ${fresh.map((p) => `${p.first_name} ${p.last_name}`).join(" & ")} in ${loc.label}`,
          });
        } else {
          const role = STAFF_ROLES[(seed >>> 6) % STAFF_ROLES.length];
          const names = readNames(loc.code);
          const name = `${names.first[(seed >>> 10) % names.first.length]} ${
            names.last[(seed >>> 16) % names.last.length]}`;
          staff.push({ name, role, scoutedIn: loc.label });
          rewards.push({
            eventKey: e.challengeId, kind: e.kind, at: e.at, verified: true, granted: true,
            summary: `Hired ${name} (${role}) in ${loc.label}`,
          });
        }
        break;
      }
      case "budget_kept": {
        const bump = Math.max(0, Math.round(e.underBy)) * 1_000;
        budgetBumps += bump;
        morale = Math.min(99, morale + 3);
        rewards.push({
          eventKey: e.tripId, kind: e.kind, at: e.at, verified: true, granted: bump > 0,
          summary: `Under budget by €${Math.round(e.underBy)} — sponsorship bonus +€${(bump / 1000).toFixed(0)}k`,
        });
        break;
      }
      case "activity_done": {
        morale = Math.min(99, morale + 4);
        rewards.push({
          eventKey: e.activityId, kind: e.kind, at: e.at, verified: true, granted: true,
          summary: `Training session "${e.activityId}" — squad morale up`,
        });
        break;
      }
      case "place_visited": {
        if (!e.verified) {
          rewards.push({
            eventKey: e.placeId, kind: e.kind, at: e.at, verified: false, granted: false,
            summary: `Visit to "${e.placeId}" — unverified, no reward`,
          });
          break;
        }
        if (seenPlaceIds.has(e.placeId)) {
          rewards.push({
            eventKey: e.placeId, kind: e.kind, at: e.at, verified: true, granted: false,
            summary: `Already claimed "${e.placeId}" — repeat visits don't pay twice`,
          });
          break;
        }
        seenPlaceIds.add(e.placeId);
        verifiedPlaces++;
        morale = Math.min(99, morale + 2);
        rewards.push({
          eventKey: e.placeId, kind: e.kind, at: e.at, verified: true, granted: true,
          summary: `Ground visited: ${e.placeId} — matchday morale up`,
        });
        break;
      }
    }
  }

  const grantedChallenges = rewards.filter((r) => r.kind === "challenge_completed" && r.granted).length;

  return {
    squad,
    staff,
    leagueTier: tierForVerifiedCount(verifiedChallenges),
    transferBudget: BASE_BUDGET + budgetBumps + grantedChallenges * CHALLENGE_APPEARANCE_FEE,
    morale: Math.max(30, Math.min(99, morale)),
    verifiedChallenges,
    verifiedPlaces,
    rewards: rewards.reverse(), // newest first for the ledger UI
  };
}

/** Average squad ability on the DB's 0-200 scale (default for an empty squad). */
export function squadStrength(club: Pick<DerivedClub, "squad">): number {
  if (club.squad.length === 0) return 92;
  return Math.round(club.squad.reduce((s, p) => s + p.ability, 0) / club.squad.length);
}
