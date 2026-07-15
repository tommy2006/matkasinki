"use client";

import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";

type ChatResponse = { message?: unknown };

function getLatestUserMessage(messages: Parameters<ChatModelAdapter["run"]>[0]["messages"]) {
  const message = [...messages].reverse().find((item) => item.role === "user");
  if (!message) return "";

  return message.content
    .filter((part): part is Extract<(typeof message.content)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function ChatThread() {
  const modelAdapter = useMemo<ChatModelAdapter>(
    () => ({
      async run({ messages, abortSignal }) {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: getLatestUserMessage(messages) }),
          signal: abortSignal,
        });

        const data = (await response.json()) as ChatResponse;
        if (!response.ok || typeof data.message !== "string") {
          throw new Error("The chat server could not respond.");
        }

        return { content: [{ type: "text", text: data.message }] };
      },
    }),
    [],
  );
  const runtime = useLocalRuntime(modelAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="chat-thread">
        <ThreadPrimitive.Viewport className="chat-thread__viewport">
          <ThreadPrimitive.Messages>
            {({ message }) => (
              <MessagePrimitive.Root
                className={`chat-message chat-message--${message.role}`}
              >
                <MessagePrimitive.Content />
              </MessagePrimitive.Root>
            )}
          </ThreadPrimitive.Messages>
        </ThreadPrimitive.Viewport>

        <ComposerPrimitive.Root className="chat-composer">
          <ComposerPrimitive.Input
            className="chat-composer__input"
            placeholder="Message…"
            aria-label="Message"
          />
          <ComposerPrimitive.Send className="chat-composer__send" aria-label="Send message">
            Send
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

export default function ChatClient() {
  return (
    <main className="chat-page">
      <ChatThread />
    </main>
  );
}
