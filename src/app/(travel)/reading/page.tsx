// /reading — server component reads the traveller's vibe + trip destination and
// serves a curated 5-book set, then hands off to the client for "Finished" XP.

import { readState } from "@/lib/store";
import ReadingClient from "./reading.client";

export const dynamic = "force-dynamic";

export default function ReadingPage() {
  let vibe = "explorer";
  let destination = "";

  try {
    const s = readState();
    if (s.profile?.vibe) vibe = s.profile.vibe;
    if (s.trip?.destination) destination = s.trip.destination;
  } catch {
    /* store unavailable — use defaults */
  }

  return (
    <main className="page">
      <div className="container">
        <ReadingClient vibe={vibe} destination={destination} />
      </div>
    </main>
  );
}
