import { suggestChallenges } from "@/features/local-guide";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    location?: string;
    vibe?: string;
    difficulty?: string;
    budget?: number;
    sustainableOnly?: boolean;
  };
  const s = readState();
  const challenges = await suggestChallenges({
    location: body.location || s.trip?.destination || "Porto, Portugal",
    vibe: body.vibe || s.profile?.vibe,
    difficulty: body.difficulty,
    budget: body.budget,
    sustainableOnly: body.sustainableOnly ?? s.settings.sustainableChallenges,
  });
  return Response.json({ challenges });
}
