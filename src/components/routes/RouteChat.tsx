"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState } from "react";
import type { LocalRoutePlan } from "@/features/local-routes/types";
import ChatMessageVisual from "@/components/routes/visuals/ChatMessageVisual";
import { extractPlanFromMessages } from "@/lib/local-routes/extract-plan";

interface RouteChatProps {
  api?: string;
  onPlanChange: (plan: LocalRoutePlan | null) => void;
  onStreamingChange?: (streaming: boolean) => void;
}

export default function RouteChat({ api = "/api/chat", onPlanChange, onStreamingChange }: RouteChatProps) {
  const [input, setInput] = useState("");
  const [agentAvailable, setAgentAvailable] = useState<boolean | null>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api }), [api]);

  useEffect(() => {
    void fetch(api)
      .then((res) => res.json())
      .then((data: { agentAvailable?: boolean }) => {
        setAgentAvailable(data.agentAvailable ?? false);
      })
      .catch(() => setAgentAvailable(null));
  }, [api]);

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onFinish: ({ messages: finished }) => {
      const plan = extractPlanFromMessages(finished);
      if (plan) onPlanChange(plan);
    },
  });

  useEffect(() => {
    const plan = extractPlanFromMessages(messages);
    if (plan) onPlanChange(plan);
  }, [messages, onPlanChange]);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    onStreamingChange?.(busy);
  }, [busy, onStreamingChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
  };

  const loadDemo = async () => {
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "demo", prompt: "Demo Helsinki route" }),
    });
    const data = (await res.json()) as { plan?: LocalRoutePlan };
    if (data.plan) onPlanChange(data.plan);
  };

  return (
    <div className="planner-chat">
      <div className="planner-chat__head">Chat</div>
      <div className="planner-chat__scroll">
        {messages.length === 0 && (
          <p className="planner-chat__empty">
            Describe a day in Helsinki — sights, museum, dinner.
            {agentAvailable === false && (
              <>
                {" "}
                <span className="planner-chat__hint">
                  (No ANTHROPIC_API_KEY — chat will load a demo route.)
                </span>
              </>
            )}
          </p>
        )}
        {messages.map((m) => (
          <ChatMessageVisual key={m.id} message={m} />
        ))}
        {error && <p className="planner-error">{error.message}</p>}
      </div>

      <form onSubmit={handleSubmit} className="planner-chat__form">
        <textarea
          className="planner-chat__input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Plan a day…"
          disabled={busy}
        />
        <button type="button" className="planner-chat__demo" onClick={() => void loadDemo()} disabled={busy}>
          Demo
        </button>
        <button type="submit" className="planner-chat__send" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
