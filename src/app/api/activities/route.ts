import { findActivities, type Difficulty, type Mood } from "@/features/activity-finder";
import { readState, updateState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "plan" | "done" | "setDifficulty";
    location?: string;
    date?: string;
    mood?: Mood;
    difficulty?: Difficulty;
    activityId?: string;
  };

  if (body.action === "done" && body.activityId) {
    updateState((s) => {
      s.events.push({ kind: "activity_done", activityId: body.activityId!, at: new Date().toISOString() });
    });
    return Response.json({ ok: true });
  }

  if (body.action === "setDifficulty" && body.difficulty) {
    updateState((s) => {
      s.settings.difficulty = body.difficulty!;
    });
    return Response.json({ ok: true });
  }

  const plan = await findActivities({
    location: body.location || readState().trip?.destination || "Porto, Portugal",
    date: body.date || new Date().toISOString().slice(0, 10),
    mood: body.mood || "curious",
    difficulty: body.difficulty || readState().settings.difficulty,
  });
  return Response.json({ plan });
}
