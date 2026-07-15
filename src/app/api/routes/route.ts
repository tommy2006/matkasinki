import { createAgentUIStreamResponse } from "ai";
import {
  isRoutePlannerAvailable,
  routePlannerAgent,
} from "@/agents/route-planner";
import { demoHelsinkiRoute } from "@/features/local-routes";
import { getRoute, listRoutes, saveRoute } from "@/lib/local-routes/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const plan = getRoute(id);
    if (!plan) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ plan });
  }
  return Response.json({ routes: listRoutes() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    messages?: unknown[];
    action?: string;
    prompt?: string;
  };

  if (body.action === "demo") {
    const plan = saveRoute(demoHelsinkiRoute(body.prompt));
    return Response.json({ plan });
  }

  if (!isRoutePlannerAvailable()) {
    const plan = saveRoute(
      demoHelsinkiRoute(
        typeof body.messages === "undefined"
          ? "Demo — add ANTHROPIC_API_KEY for live agent"
          : "Demo route (no API key)",
      ),
    );
    return Response.json({
      error: "ANTHROPIC_API_KEY not set — loaded demo route instead",
      plan,
      demo: true,
    });
  }

  const uiMessages = body.messages ?? [];
  if (!Array.isArray(uiMessages) || uiMessages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  return createAgentUIStreamResponse({
    agent: routePlannerAgent,
    uiMessages,
  });
}
