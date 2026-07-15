import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import type { LocalRoutePlan } from "@/features/local-routes/types";

function uiStream(chunks: UIMessageChunk[]): ReadableStream<UIMessageChunk> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

export function createDemoStreamResponse(plan: LocalRoutePlan, notice: string): Response {
  const messageId = `demo-${plan.id}`;
  const textId = `${messageId}-text`;
  const toolCallId = `${messageId}-save-plan`;

  return createUIMessageStreamResponse({
    stream: uiStream([
      { type: "start", messageId },
      { type: "start-step" },
      { type: "text-start", id: textId },
      { type: "text-delta", id: textId, delta: notice },
      { type: "text-end", id: textId },
      {
        type: "tool-input-available",
        toolCallId,
        toolName: "savePlan",
        input: { title: plan.title, prompt: plan.prompt },
        providerExecuted: true,
      },
      {
        type: "tool-output-available",
        toolCallId,
        output: { ok: true, id: plan.id, plan: { ...plan, demo: true } },
        providerExecuted: true,
      },
      { type: "finish-step" },
      { type: "finish", finishReason: "stop" },
    ]),
  });
}

export function createErrorStreamResponse(message: string): Response {
  const messageId = `error-${Date.now()}`;
  const textId = `${messageId}-text`;

  return createUIMessageStreamResponse({
    stream: uiStream([
      { type: "start", messageId },
      { type: "error", errorText: message },
      { type: "text-start", id: textId },
      { type: "text-delta", id: textId, delta: message },
      { type: "text-end", id: textId },
      { type: "finish", finishReason: "error" },
    ]),
  });
}
