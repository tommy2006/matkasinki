import { verifyCompletion, type Proof } from "@/agents/verifier";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    challengeId?: string;
    placeId?: string;
    proof?: Proof;
  };
  const challengeId = body.challengeId || "unknown";
  const verdict = await verifyCompletion(challengeId, body.proof || {});

  // Record the attempt either way; only VERIFIED events earn rewards downstream.
  const at = new Date().toISOString();
  updateState((s) => {
    s.events.push({ kind: "challenge_completed", challengeId, verified: verdict.verified, at });
    if (verdict.verified && body.placeId) {
      s.events.push({ kind: "place_visited", placeId: body.placeId, verified: true, at });
    }
  });

  return Response.json({ verdict });
}
