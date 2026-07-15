"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import type { LocalRoutePlan } from "@/features/local-routes/types";

function extractPlanFromMessages(messages: UIMessage[]): LocalRoutePlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant" || !msg.parts) continue;
    for (const part of msg.parts) {
      if (!isToolUIPart(part)) continue;
      if (getToolName(part) !== "savePlan") continue;
      if (part.state !== "output-available") continue;
      const raw = part.output;
      if (raw && typeof raw === "object") {
        const o = raw as { plan?: LocalRoutePlan };
        if (o.plan) return o.plan;
      }
    }
  }
  return null;
}

interface RouteChatProps {
  onPlanChange: (plan: LocalRoutePlan | null) => void;
}

export default function RouteChat({ onPlanChange }: RouteChatProps) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/routes" }),
    [],
  );

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
  };

  const loadDemo = async () => {
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "demo", prompt: "Demo Helsinki route" }),
    });
    const data = (await res.json()) as { plan?: LocalRoutePlan };
    if (data.plan) onPlanChange(data.plan);
  };

  return (
    <div className="card routes-chat stack" style={{ gap: "var(--space-4)", height: "100%" }}>
      <div className="stack" style={{ gap: "var(--space-2)" }}>
        <span className="badge badge--accent">Helsinki routes</span>
        <h2 style={{ margin: 0 }}>Plan your day</h2>
        <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
          e.g. &quot;visit some sights and a museum, end with a good restaurant and drinks&quot;
        </p>
      </div>

      <div className="routes-chat__messages stack" style={{ gap: "var(--space-3)", flex: 1, overflowY: "auto" }}>
        {messages.length === 0 && (
          <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
            Ask for a Helsinki day route. The agent searches real places, plans HSL transit, and draws the path on the map.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`routes-chat__msg routes-chat__msg--${m.role}`}
          >
            <span className="routes-chat__role">{m.role === "user" ? "You" : "Planner"}</span>
            <div className="routes-chat__text">
              {m.parts
                ?.filter((p) => p.type === "text")
                .map((p, i) => (
                  <span key={i}>{(p as { text: string }).text}</span>
                ))}
            </div>
          </div>
        ))}
        {busy && <p className="muted" style={{ margin: 0 }}>Planning…</p>}
        {error && <p className="routes-error">{error.message}</p>}
      </div>

      <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-2)" }}>
        <textarea
          className="input routes-chat__input"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your ideal Helsinki day…"
          disabled={busy}
        />
        <div className="row">
          <button type="submit" className="btn btn--lg glow" disabled={busy || !input.trim()}>
            {busy ? "Planning…" : "Build route"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => void loadDemo()} disabled={busy}>
            Load demo
          </button>
        </div>
      </form>
    </div>
  );
}
