import { createAgentUIStreamResponse } from "ai";
import { getSamplePlanForPrompt } from "@/features/local-routes";
import { isDemoMode, useLiveRouteAgent } from "@/features/local-routes/chat-suggestions";
import { getRoute, listRoutes } from "@/lib/local-routes/store";
import { createSampleStreamResponse } from "./demo-stream";
import { routePlannerAgent } from "./index";

export async function handleRoutePlannerGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const plan = await getRoute(id);
    if (!plan) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ plan });
  }
  const routes = await listRoutes();
  return Response.json({
    routes,
    demoMode: isDemoMode(),
    agentAvailable: useLiveRouteAgent(),
  });
}

function promptFromBody(body: {
  prompt?: string;
  message?: string;
  messages?: unknown[];
}): string {
  if (typeof body.prompt === "string" && body.prompt.trim()) return body.prompt.trim();
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  if (Array.isArray(body.messages)) {
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const msg = body.messages[i];
      if (!msg || typeof msg !== "object") continue;
      const m = msg as { role?: string; parts?: { type?: string; text?: string }[] };
      if (m.role !== "user" || !Array.isArray(m.parts)) continue;
      const text = m.parts
        .filter((p) => p?.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("")
        .trim();
      if (text) return text;
    }
  }
  return "";
}

function sampleResponse(prompt: string): Response {
  const { plan, reply } = getSamplePlanForPrompt(prompt);
  return createSampleStreamResponse(plan, reply);
}

export async function handleRoutePlannerPost(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    messages?: unknown[];
    prompt?: string;
    message?: string;
  };

  let uiMessages = body.messages;
  if ((!uiMessages || !Array.isArray(uiMessages) || uiMessages.length === 0) && body.message) {
    const text = typeof body.message === "string" ? body.message.trim() : "";
    if (text) {
      uiMessages = [{ id: "legacy-user", role: "user", parts: [{ type: "text", text }] }];
    }
  }

  if (!Array.isArray(uiMessages) || uiMessages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const prompt = promptFromBody(body);

  if (isDemoMode() || !useLiveRouteAgent()) {
    return sampleResponse(prompt);
  }

  try {
    return await createAgentUIStreamResponse({
      agent: routePlannerAgent,
      uiMessages,
      // The Response is returned before the model runs, so a mid-stream failure
      // can't be caught by try/catch. Translate it into something actionable.
      onError: (error) => humanErrorMessage(error),
    });
  } catch (error) {
    // Failed before streaming even started — fall back to a sample plan.
    console.error("[route-planner] live agent unavailable:", error);
    return sampleResponse(prompt);
  }
}

/** Turn raw provider errors into messages a human can act on. */
function humanErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (/credit balance is too low/i.test(msg)) {
    return (
      "The AI planner is unavailable: this Anthropic account has no API credits. " +
      "Add credits at console.anthropic.com → Plans & Billing — and make sure it's the same " +
      "organisation/workspace the API key belongs to — then try again."
    );
  }
  if (/rate.?limit|\b429\b/i.test(msg)) {
    return "The AI planner is rate-limited right now. Please wait a moment and try again.";
  }
  if (/api[- ]?key|authentication|\b401\b/i.test(msg)) {
    return "The AI planner isn't configured correctly — check ANTHROPIC_API_KEY in your .env, then restart the server.";
  }
  if (/overloaded|\b529\b|\b503\b/i.test(msg)) {
    return "The AI service is temporarily overloaded. Please try again shortly.";
  }
  return "The AI planner hit an unexpected error. The server log has the details.";
}
