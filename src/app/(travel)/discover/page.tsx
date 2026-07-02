// /discover — server component reads the saved profile for the user's vibe,
// then hands off to a client subcomponent for the interactive discovery UI.

import { readState } from "@/lib/store";
import DiscoverClient from "./discover.client";

export const dynamic = "force-dynamic";

export default function DiscoverPage() {
  let vibe = "explorer";
  let hasProfile = false;
  try {
    const profile = readState().profile;
    if (profile?.vibe) {
      vibe = profile.vibe;
      hasProfile = true;
    }
  } catch {
    /* store unavailable — fall back to the explorer default */
  }

  return (
    <main className="page">
      <div className="container">
        <DiscoverClient vibe={vibe} hasProfile={hasProfile} />
      </div>
    </main>
  );
}
