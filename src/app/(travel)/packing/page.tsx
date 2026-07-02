// /packing — server component reads the trip dates/destination and generates the
// initial forecast-driven packing list, then hands off to the client.

import { readState } from "@/lib/store";
import { generatePackingList, type PackingList } from "@/features/packing-list";
import PackingClient from "./packing.client";

export const dynamic = "force-dynamic";

function defaultDates() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 5);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default async function PackingPage() {
  let destination = "Lisbon";
  let dates = defaultDates();

  try {
    const s = readState();
    if (s.trip?.destination) destination = s.trip.destination;
    if (s.trip?.dates?.start && s.trip?.dates?.end) dates = s.trip.dates;
  } catch {
    /* store unavailable — use defaults */
  }

  let initial: PackingList | null = null;
  try {
    initial = await generatePackingList({ destination, dates });
  } catch {
    initial = null;
  }

  return (
    <main className="page">
      <div className="container">
        <PackingClient destination={destination} dates={dates} initial={initial} />
      </div>
    </main>
  );
}
