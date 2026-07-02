// /away — server component prefills the OOO composer from the trip, then hands
// off to the client for the composer, inbox triage demo, and home-sitter board.

import { readState } from "@/lib/store";
import AwayClient from "./away.client";

export const dynamic = "force-dynamic";

export default function AwayPage() {
  let destination = "";
  let dates: { start: string; end: string } | null = null;

  try {
    const s = readState();
    if (s.trip?.destination) destination = s.trip.destination;
    if (s.trip?.dates?.start && s.trip?.dates?.end) dates = s.trip.dates;
  } catch {
    /* store unavailable — empty prefill */
  }

  return (
    <main className="page">
      <div className="container">
        <AwayClient destination={destination} dates={dates} />
      </div>
    </main>
  );
}
