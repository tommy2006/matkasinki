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
  stopWhen: stepCountIs(6),
});

export function isRoutePlannerAvailable(): boolean {
  return useLiveRouteAgent();
}

export { routeTools } from "./tools";
