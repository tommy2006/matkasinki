import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import type { LocalRoutePlan, Place } from "@/features/local-routes/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function placesFromPlan(plan: LocalRoutePlan): Place[] {
  return plan.stops.map((stop, i) => ({
    id: `place-${i}`,
    name: stop.name,
    lat: stop.lat,
    lon: stop.lon,
    category: stop.category,
  }));
}

function buildToolStream(plan: LocalRoutePlan, reply: string, messageId: string): UIMessageChunk[] {
  const searchId = `${messageId}-search`;
  const routeId = `${messageId}-route`;
  const saveId = `${messageId}-save`;
  const textId = `${messageId}-text`;
  const places = placesFromPlan(plan);

  const chunks: UIMessageChunk[] = [
    { type: "start", messageId },
    { type: "start-step" },
    {
      type: "tool-input-available",
      toolCallId: searchId,
      toolName: "searchPlaces",
      input: { categories: ["any"], limit: 25 },
      providerExecuted: true,
    },
    {
      type: "tool-output-available",
      toolCallId: searchId,
      output: { count: places.length, places },
      providerExecuted: true,
    },
    {
      type: "tool-input-available",
      toolCallId: routeId,
      toolName: "planItinerary",
      input: {
        originLat: plan.origin.lat,
        originLon: plan.origin.lon,
        destinationLat: plan.stops[plan.stops.length - 1]?.lat,
        destinationLon: plan.stops[plan.stops.length - 1]?.lon,
      },
      providerExecuted: true,
    },
    {
      type: "tool-output-available",
      toolCallId: routeId,
      output: {
        routeId,
        legCount: plan.legs.length,
        // Mirrors the live tool: the model-facing legs carry no geometry.
        legs: plan.legs.map(({ polyline: _polyline, ...leg }) => leg),
      },
      providerExecuted: true,
    },
    {
      type: "tool-input-available",
      toolCallId: saveId,
      toolName: "savePlan",
      input: {
        prompt: plan.prompt,
        title: plan.title,
        summary: plan.summary,
        originLat: plan.origin.lat,
        originLon: plan.origin.lon,
        days: plan.days,
        stops: plan.stops.map((s) => ({
          name: s.name,
          lat: s.lat,
          lon: s.lon,
          day: s.day,
          category: s.category,
          dwellMinutes: s.dwellMinutes,
          timeLabel: s.timeLabel,
          why: s.why,
        })),
        routeIds: [routeId],
      },
      providerExecuted: true,
    },
    {
      type: "tool-output-available",
      toolCallId: saveId,
      output: { ok: true, id: plan.id, plan },
      providerExecuted: true,
    },
    { type: "text-start", id: textId },
    { type: "text-delta", id: textId, delta: reply },
    { type: "text-end", id: textId },
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  ];

  return chunks;
}

export function createSampleStreamResponse(plan: LocalRoutePlan, reply: string): Response {
  const messageId = `plan-${plan.id}`;

  const stream = new ReadableStream<UIMessageChunk>({
    async start(controller) {
      const chunks = buildToolStream(plan, reply, messageId);
      const delays = [0, 0, 280, 420, 520, 680, 820, 920, 0, 120, 0, 0, 0];

      for (let i = 0; i < chunks.length; i++) {
        if (delays[i]) await sleep(delays[i]);
        controller.enqueue(chunks[i]);
      }

      controller.close();
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export function createErrorStreamResponse(message: string): Response {
  const messageId = `error-${Date.now()}`;
  const textId = `${messageId}-text`;

  return createUIMessageStreamResponse({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "start", messageId });
        controller.enqueue({ type: "text-start", id: textId });
        controller.enqueue({ type: "text-delta", id: textId, delta: message });
        controller.enqueue({ type: "text-end", id: textId });
        controller.enqueue({ type: "finish", finishReason: "error" });
        controller.close();
      },
    }),
  });
}

export const createDemoStreamResponse = createSampleStreamResponse;
