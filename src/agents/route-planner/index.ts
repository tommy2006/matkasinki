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
  // A multi-day trip needs a step per day for planItinerary, plus lookups,
  // savePlan and the final reply. The real failure mode was the model spending
  // its whole budget geocoding places one at a time and never reaching savePlan
  // — batched geocoding (see tools) is the primary fix; this ceiling is the
  // backstop, high enough that even a step-hungry 5-day plan still saves.
  stopWhen: stepCountIs(32),
});

export function isRoutePlannerAvailable(): boolean {
  return useLiveRouteAgent();
}

export { routeTools } from "./tools";
