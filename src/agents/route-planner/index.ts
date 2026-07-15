import { ToolLoopAgent } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { MODELS } from "@/agents/shared/llm";
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
});

export function isRoutePlannerAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export { routeTools } from "./tools";
