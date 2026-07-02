// /guide — server component builds the challenge list for the trip destination
// from the built-in sourced sets (Scout Agent fallback), reads the sustainability
// setting + logged expenses (for receipt-matching proof), then hands off.

import { readState } from "@/lib/store";
import { BUILTIN_SETS, genericSet, guessCountryCode } from "@/features/local-guide/builtin";
import type { Challenge } from "@/features/local-guide";
import GuideClient, { type GuideChallenge, type ReceiptOption } from "./guide.client";

export const dynamic = "force-dynamic";

function buildChallenges(destination: string): GuideChallenge[] {
  const key = destination.trim().toLowerCase();
  const cc = guessCountryCode(destination);
  const placeId = `${cc}:${key}`;
  const seeds = BUILTIN_SETS[key] ?? genericSet(destination);
  return seeds.map((s, i) => ({
    ...s,
    id: `chal-${cc}-${i}`,
    placeId,
  })) as (Challenge & GuideChallenge)[];
}

export default function GuidePage() {
  let destination = "Lisbon";
  let sustainableDefault = true;
  let receipts: ReceiptOption[] = [];

  try {
    const s = readState();
    if (s.trip?.destination) destination = s.trip.destination;
    if (typeof s.settings?.sustainableChallenges === "boolean") {
      sustainableDefault = s.settings.sustainableChallenges;
    }
    receipts = (s.expenses ?? []).map((e, index) => ({
      index,
      label: `${e.amount} ${e.currency} · ${e.category}${e.note ? ` — ${e.note}` : ""}`,
    }));
  } catch {
    /* store unavailable — use defaults */
  }

  const challenges = buildChallenges(destination);

  return (
    <main className="page">
      <div className="container">
        <GuideClient
          destination={destination}
          challenges={challenges}
          sustainableDefault={sustainableDefault}
          receipts={receipts}
        />
      </div>
    </main>
  );
}
