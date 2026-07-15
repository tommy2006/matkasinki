// HSL zone-based fare + ticket logic.
// HSL sells zone tickets covering a CONTIGUOUS range of zones (A→E) from the
// lowest to the highest zone a trip touches. Touching {A,C} needs an ABC ticket
// because B sits between them. This module is pure and deterministic: no fs,
// no I/O, no external project imports. Prices/validity use current HSL adult
// single-ticket values (2024/2025 zone-combo rules).

export interface FareInfo {
  zonesTouched: string[]; // sorted unique subset of ["A","B","C","D","E"] actually visited
  ticket: string; // contiguous span, e.g. "AB", "ABC", "BCD", "ABCD"
  priceEUR: number; // single adult ticket price for that ticket
  validityMinutes: number; // HSL single-ticket validity for that ticket
  description: string; // short human line
}

const ZONE_ORDER = ["A", "B", "C", "D", "E"] as const;
type Zone = (typeof ZONE_ORDER)[number];

const ZONE_INDEX: Record<Zone, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

interface TicketDef {
  priceEUR: number;
  validityMinutes: number;
  description: string;
}

// Lookup keyed by ticket string (contiguous span).
const FARE_TABLE: Record<string, TicketDef> = {
  // Single-zone tickets
  A: {
    priceEUR: 3.2,
    validityMinutes: 60,
    description: "A single — covers central Helsinki",
  },
  B: {
    priceEUR: 3.2,
    validityMinutes: 60,
    description: "B single — covers the Helsinki/Espoo/Vantaa core ring",
  },
  C: {
    priceEUR: 3.2,
    validityMinutes: 60,
    description: "C single — covers the airport and outer Espoo/Vantaa",
  },
  D: {
    priceEUR: 3.2,
    validityMinutes: 60,
    description: "D single — covers Kirkkonummi, Kerava and Sipoo",
  },
  E: {
    priceEUR: 3.2,
    validityMinutes: 60,
    description: "E single — covers Siuntio",
  },

  // Two-zone tickets
  AB: {
    priceEUR: 3.2,
    validityMinutes: 80,
    description: "AB single — covers Helsinki and the Espoo/Vantaa core",
  },
  BC: {
    priceEUR: 3.2,
    validityMinutes: 80,
    description: "BC single — covers the core ring, airport and outer Espoo/Vantaa",
  },
  CD: {
    priceEUR: 3.2,
    validityMinutes: 80,
    description: "CD single — covers the airport out to Kirkkonummi, Kerava and Sipoo",
  },
  DE: {
    priceEUR: 3.2,
    validityMinutes: 80,
    description: "DE single — covers Kirkkonummi/Kerava/Sipoo and Siuntio",
  },

  // Three-zone tickets
  ABC: {
    priceEUR: 4.1,
    validityMinutes: 90,
    description: "ABC single — covers Helsinki, Espoo, Vantaa and the airport",
  },
  BCD: {
    priceEUR: 4.1,
    validityMinutes: 90,
    description: "BCD single — covers the core ring, airport and Kirkkonummi/Kerava/Sipoo",
  },
  CDE: {
    priceEUR: 4.1,
    validityMinutes: 90,
    description: "CDE single — covers the airport, Kirkkonummi/Kerava/Sipoo and Siuntio",
  },

  // Four-zone tickets
  ABCD: {
    priceEUR: 5.7,
    validityMinutes: 100,
    description: "ABCD single — covers Helsinki out to Kirkkonummi, Kerava and Sipoo",
  },
  BCDE: {
    priceEUR: 5.7,
    validityMinutes: 100,
    description: "BCDE single — covers the core ring out to Siuntio",
  },

  // Five-zone ticket
  ABCDE: {
    priceEUR: 5.7,
    validityMinutes: 100,
    description: "ABCDE single — covers the whole HSL area from Helsinki to Siuntio",
  },
};

// Fallback by zone-count when a specific combo is not in the table.
function fallbackByCount(count: number, ticket: string): TicketDef {
  if (count <= 2) {
    return {
      priceEUR: 3.2,
      validityMinutes: 80,
      description: `${ticket} single — two-zone ticket`,
    };
  }
  if (count === 3) {
    return {
      priceEUR: 4.1,
      validityMinutes: 90,
      description: `${ticket} single — three-zone ticket`,
    };
  }
  // 4 or 5 zones
  return {
    priceEUR: 5.7,
    validityMinutes: 100,
    description: `${ticket} single — ${count}-zone ticket`,
  };
}

/**
 * Given the zone letters the journey passes through (from every stop on the
 * route), compute the required ticket. Ignores null/undefined/non-ABCDE zones.
 * If fewer than 1 valid zone is present, defaults to "A".
 */
export function computeFare(zones: (string | null | undefined)[]): FareInfo {
  // Normalise: keep only valid A–E letters, unique.
  const validSet = new Set<Zone>();
  for (const z of zones) {
    if (typeof z !== "string") continue;
    const upper = z.trim().toUpperCase();
    if (upper in ZONE_INDEX) {
      validSet.add(upper as Zone);
    }
  }

  // Default to "A" if nothing valid was touched.
  if (validSet.size === 0) {
    validSet.add("A");
  }

  const zonesTouched = ZONE_ORDER.filter((z) => validSet.has(z));

  // Contiguous span: fill from min to max touched zone.
  const minIdx = ZONE_INDEX[zonesTouched[0]];
  const maxIdx = ZONE_INDEX[zonesTouched[zonesTouched.length - 1]];
  const spanZones = ZONE_ORDER.slice(minIdx, maxIdx + 1);
  const ticket = spanZones.join("");

  const def = FARE_TABLE[ticket] ?? fallbackByCount(spanZones.length, ticket);

  return {
    zonesTouched: [...zonesTouched],
    ticket,
    priceEUR: def.priceEUR,
    validityMinutes: def.validityMinutes,
    description: def.description,
  };
}
