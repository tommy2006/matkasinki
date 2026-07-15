import Anthropic from "@anthropic-ai/sdk";

// Shared Claude client for the conversational route-planner (/chat).
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fast model for interactive chat; capable model for heavier planning.
export const MODELS = {
  interactive: "claude-sonnet-5",
  research: "claude-opus-4-8",
} as const;
