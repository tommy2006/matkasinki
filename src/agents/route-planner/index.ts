import { ToolLoopAgent, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { MODELS } from "@/agents/shared/llm";
import { useLiveRouteAgent } from "@/features/local-routes/chat-suggestions";
import { HELSINKI_SYSTEM_PROMPT } from "./system";
import { routeTools } from "./tools";

const modelId =
  process.env.AI_ROUTE_MODEL ??
  process.env.ANTHROPIC_MODEL ??
  MODELS.interactive;

export const routePlannerAgent = new ToolLoopAgent({
  model: anthropic(modelId),
  instructions: HELSINKI_SYSTEM_PROMPT,
  tools: routeTools,
  // A multi-day trip needs a step per day for planItinerary, plus place lookups,
  // savePlan and the final reply. At 6 a 3-day plan ran out mid-routing and
  // never reached savePlan, so no map was ever drawn. 18 clears a 5-day trip
  // (the prompt's ceiling) with room for a retry.
  stopWhen: stepCountIs(18),
});

export function isRoutePlannerAvailable(): boolean {
  return useLiveRouteAgent();
}

export { routeTools } from "./tools";
