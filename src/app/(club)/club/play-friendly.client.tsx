"use client";

// Client "Play friendly" flow: POSTs /api/club/friendly and renders the
// minute-by-minute match report returned by the football engine.

import { useState } from "react";

type MatchEventType =
  | "kickoff" | "chance" | "save" | "goal" | "card" | "halftime" | "fulltime";

interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team?: "home" | "away";
  player?: string;
  detail: string;
}

interface FriendlyResponse {
  result: {
    homeName: string;
    awayName: string;
    homeGoals: number;
    awayGoals: number;
    events: MatchEvent[];
    motm: { name: string; team: "home" | "away" };
    seed: number;
  };
  opponent: { name: string; country: string; league: string; ability: number };
  user: { name: string; ability: number; tier: number; tierName: string; squadSize: number };
}

const EVENT_COLOR: Record<MatchEventType, string> = {
  kickoff: "var(--fg-muted)",
  chance: "var(--fg-muted)",
  save: "var(--fg-muted)",
  goal: "var(--accent)",
  card: "var(--accent-2)",
  halftime: "var(--fg-muted)",
  fulltime: "var(--fg)",
};

const EVENT_ICON: Record<MatchEventType, string> = {
  kickoff: "•", chance: "→", save: "✋", goal: "⚽", card: "▮", halftime: "⏸", fulltime: "⏱",
};

export default function PlayFriendly({
  clubName,
  tierName,
  accent,
}: {
  clubName: string;
  tierName: string;
  accent: string;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FriendlyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function play() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/friendly", { method: "POST" });
      if (!res.ok) throw new Error(`Match sim failed (${res.status})`);
      setData((await res.json()) as FriendlyResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const r = data?.result;
  const win = r ? r.homeGoals > r.awayGoals : false;
  const draw = r ? r.homeGoals === r.awayGoals : false;

  return (
    <section className="card rise rise-1" style={{ borderColor: accent }}>
      <div className="spread" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div className="stack" style={{ gap: 2 }}>
          <h2 style={{ margin: 0 }}>Matchday</h2>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            Line up a friendly against a real {tierName} opponent.
          </span>
        </div>
        <button className="btn btn--amber btn--lg" onClick={play} disabled={loading}>
          {loading ? "Kicking off…" : data ? "Play again" : "Play friendly"}
        </button>
      </div>

      {error && (
        <p style={{ color: "var(--danger)", marginTop: "var(--space-4)", marginBottom: 0 }}>{error}</p>
      )}

      {r && (
        <div className="stack" style={{ marginTop: "var(--space-5)", gap: "var(--space-5)" }}>
          {/* scoreline */}
          <div
            className="card"
            style={{
              background: "var(--bg-overlay)",
              textAlign: "center",
              padding: "var(--space-5)",
            }}
          >
            <div className="badge badge--amber" style={{ marginBottom: "var(--space-3)" }}>
              {win ? "Victory" : draw ? "Draw" : "Defeat"}
            </div>
            <div className="row" style={{ justifyContent: "center", gap: "var(--space-5)", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", flex: 1, textAlign: "right" }}>
                {r.homeName}
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2.6rem", letterSpacing: "0.04em" }}>
                {r.homeGoals}–{r.awayGoals}
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", flex: 1, textAlign: "left" }}>
                {r.awayName}
              </span>
            </div>
            {data && (
              <div className="muted" style={{ fontSize: "0.8rem", marginTop: "var(--space-3)" }}>
                {data.opponent.league} · {data.opponent.country} · opponent ability {data.opponent.ability}
              </div>
            )}
            <div className="row" style={{ justifyContent: "center", marginTop: "var(--space-4)" }}>
              <span className="badge badge--accent">★ MOTM: {r.motm.name}</span>
            </div>
          </div>

          {/* timeline */}
          <div className="stack" style={{ gap: "var(--space-2)" }}>
            <h3 style={{ margin: 0 }}>Minute-by-minute</h3>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {r.events.map((ev, i) => (
                <div
                  key={i}
                  className="row"
                  style={{
                    gap: "var(--space-3)",
                    padding: "var(--space-2) var(--space-5)",
                    borderTop: i === 0 ? "none" : "1px solid var(--line)",
                    background: ev.type === "goal" ? "rgba(52,211,153,0.06)" : "transparent",
                    flexWrap: "nowrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      minWidth: 42,
                      color: "var(--fg-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {ev.minute}′
                  </span>
                  <span style={{ color: EVENT_COLOR[ev.type], minWidth: 18, textAlign: "center" }}>
                    {EVENT_ICON[ev.type]}
                  </span>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: ev.type === "goal" || ev.type === "fulltime" ? "var(--fg)" : "var(--fg-muted)",
                      fontWeight: ev.type === "goal" ? 600 : 400,
                    }}
                  >
                    {ev.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
