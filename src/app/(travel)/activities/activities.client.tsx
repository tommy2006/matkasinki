"use client";

// Interactive day-plan builder: mood chips + difficulty selector re-plan the
// day via /api/activities; "Mark done" logs an activity_done event.

import { useState } from "react";
import type { DayPlan, Difficulty, Mood } from "@/features/activity-finder";

const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: "curious", label: "Curious", emoji: "🧭" },
  { id: "foodie", label: "Foodie", emoji: "🍜" },
  { id: "culture", label: "Culture", emoji: "🎭" },
  { id: "relax", label: "Relax", emoji: "🌿" },
  { id: "adventure", label: "Adventure", emoji: "⛰️" },
  { id: "social", label: "Social", emoji: "🍻" },
];

const DIFFICULTIES: Difficulty[] = ["chill", "standard", "adventurous", "hardcore"];

const INTENSITY_LABEL: Record<number, string> = { 1: "Easy", 2: "Moderate", 3: "Full send" };

export default function ActivitiesClient({
  destination,
  date,
  difficulty: initialDifficulty,
  initialPlan,
}: {
  destination: string;
  date: string;
  difficulty: Difficulty;
  initialPlan: DayPlan | null;
}) {
  const [place, setPlace] = useState(destination);
  const [day, setDay] = useState(date);
  const [mood, setMood] = useState<Mood>("curious");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [plan, setPlan] = useState<DayPlan | null>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  async function regenerate(next?: { mood?: Mood; difficulty?: Difficulty }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: place,
          date: day,
          mood: next?.mood ?? mood,
          difficulty: next?.difficulty ?? difficulty,
        }),
      });
      const data = await res.json().catch(() => null);
      const nextPlan: DayPlan | undefined = data?.plan ?? data;
      if (!res.ok || !nextPlan?.activities) throw new Error(data?.error ?? "Could not build a plan");
      setPlan(nextPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function pickMood(m: Mood) {
    setMood(m);
    regenerate({ mood: m });
  }
  function pickDifficulty(d: Difficulty) {
    setDifficulty(d);
    regenerate({ difficulty: d });
  }

  async function markDone(activityId: string) {
    setDone((d) => ({ ...d, [activityId]: true }));
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "done", activityId }),
      });
    } catch {
      /* optimistic — the tick stays either way */
    }
  }

  return (
    <div className="stack">
      <div className="stack rise rise-1" style={{ gap: "var(--space-2)" }}>
        <h1>Today&apos;s plan</h1>
        <p className="muted">
          A coherent, weather-aware day for a place you don&apos;t know yet. Pick a mood, dial the
          intensity, and mark things done as you go.
        </p>
      </div>

      <div className="card rise rise-2 stack">
        <div className="grid grid--2">
          <label className="stack" style={{ gap: "var(--space-1)" }}>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Destination</span>
            <input
              className="input"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onBlur={() => regenerate()}
              placeholder="Where to?"
            />
          </label>
          <label className="stack" style={{ gap: "var(--space-1)" }}>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Date</span>
            <input
              className="input"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              onBlur={() => regenerate()}
            />
          </label>
        </div>

        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>Mood</span>
          <div className="row">
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={m.id === mood ? "btn" : "btn btn--ghost"}
                onClick={() => pickMood(m.id)}
                disabled={loading}
              >
                <span aria-hidden>{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>Difficulty</span>
          <div className="row">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={d === difficulty ? "btn btn--amber" : "btn btn--ghost"}
                onClick={() => pickDifficulty(d)}
                disabled={loading}
                style={{ textTransform: "capitalize" }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <button className="btn" onClick={() => regenerate()} disabled={loading}>
            {loading ? "Planning…" : "Rebuild the day"}
          </button>
          {error && <span className="badge badge--amber">{error}</span>}
        </div>
      </div>

      {plan && (
        <>
          <div className="card rise rise-3 stack">
            <div className="spread">
              <div className="row">
                {plan.weatherLive ? (
                  <span className="badge badge--accent">● Live weather</span>
                ) : (
                  <span className="badge">Estimated weather</span>
                )}
                <span className="badge">{plan.source === "claude" ? "AI-planned" : "Smart template"}</span>
              </div>
              <span className="badge">
                {plan.weather.icon} {plan.weather.tMin}–{plan.weather.tMax}°C · {plan.weather.precipProb}% rain
              </span>
            </div>
            <h2 style={{ margin: 0 }}>{plan.headline}</h2>
          </div>

          <div className="stack rise rise-4">
            <h3>Itinerary</h3>
            {plan.activities.map((a) => (
              <div key={a.id} className="card card--interactive spread">
                <div className="stack" style={{ gap: "var(--space-1)", flex: 1 }}>
                  <div className="row">
                    <span className="badge badge--amber">{a.time}</span>
                    <strong>{a.title}</strong>
                    <span className="badge">{a.indoor ? "Indoor" : "Outdoor"}</span>
                    <span className="badge">{INTENSITY_LABEL[a.intensity]}</span>
                  </div>
                  <p className="muted" style={{ margin: 0 }}>{a.description}</p>
                </div>
                <button
                  className={done[a.id] ? "btn btn--ghost" : "btn"}
                  onClick={() => markDone(a.id)}
                  disabled={done[a.id]}
                >
                  {done[a.id] ? "✓ Done" : "Mark done"}
                </button>
              </div>
            ))}
          </div>

          {plan.challenges.length > 0 && (
            <div className="stack">
              <h3>Day challenges</h3>
              <div className="grid grid--2">
                {plan.challenges.map((c) => (
                  <div key={c.id} className="card stack" style={{ gap: "var(--space-2)" }}>
                    <div className="row">
                      <span className="badge badge--accent">Challenge</span>
                      <strong>{c.title}</strong>
                    </div>
                    <p className="muted" style={{ margin: 0 }}>{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!plan && !loading && (
        <div className="card muted">No plan yet — pick a mood to build your day.</div>
      )}
    </div>
  );
}
