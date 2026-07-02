// /activities — server component reads the trip from the store, computes an
// initial weather-aware day plan, then hands off to the client for interaction.

import { readState } from "@/lib/store";
import { findActivities, type DayPlan, type Difficulty } from "@/features/activity-finder";
import ActivitiesClient from "./activities.client";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  let destination = "Lisbon";
  let date = new Date().toISOString().slice(0, 10);
  let difficulty: Difficulty = "standard";

  try {
    const s = readState();
    if (s.trip?.destination) destination = s.trip.destination;
    if (s.trip?.dates?.start) date = s.trip.dates.start;
    if (s.settings?.difficulty) difficulty = s.settings.difficulty;
  } catch {
    /* store unavailable — use defaults */
  }

  let initialPlan: DayPlan | null = null;
  try {
    initialPlan = await findActivities({ location: destination, date, mood: "curious", difficulty });
  } catch {
    initialPlan = null;
  }

  return (
    <main className="page">
      <div className="container">
        <ActivitiesClient
          destination={destination}
          date={date}
          difficulty={difficulty}
          initialPlan={initialPlan}
        />
      </div>
    </main>
  );
}
