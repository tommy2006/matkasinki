"use client";

// Compact weather switcher. Flips today's dummy weather so the rain/snow →
// transport routing bias is demoable. Sits above the itinerary builder.

import { useEffect, useState } from "react";

type Condition = "clear" | "clouds" | "rain" | "snow";

type Weather = {
  date: string;
  condition: string;
  tempC: number;
  precipitationMm: number;
  windKmh: number;
  summary: string;
};

const CHIPS: { condition: Condition; icon: string; label: string }[] = [
  { condition: "clear", icon: "☀️", label: "Clear" },
  { condition: "clouds", icon: "☁️", label: "Clouds" },
  { condition: "rain", icon: "🌧️", label: "Rain" },
  { condition: "snow", icon: "❄️", label: "Snow" },
];

const ICONS: Record<string, string> = {
  clear: "☀️",
  clouds: "☁️",
  rain: "🌧️",
  snow: "❄️",
};

export default function WeatherControl({ onChange }: { onChange?: () => void }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [busy, setBusy] = useState<Condition | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/weather")
      .then((r) => r.json())
      .then((w) => {
        if (alive) setWeather(w);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const pick = async (condition: Condition) => {
    if (busy || weather?.condition === condition) return;
    setBusy(condition);
    try {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition }),
      });
      if (res.ok) {
        setWeather(await res.json());
        onChange?.();
      }
    } catch {
      // ignore — leave prior state
    } finally {
      setBusy(null);
    }
  };

  const active = weather?.condition ?? "";

  return (
    <div className="wc card stack">
      <style>{css}</style>

      <div className="spread wc-head">
        <div className="row wc-now">
          <span className="wc-now-icon">{ICONS[active] ?? "🌡️"}</span>
          <div className="stack wc-now-text">
            <span className="wc-temp">
              {weather ? `${Math.round(weather.tempC)}°C` : "—"}
              <span className="wc-cond">{active || "loading…"}</span>
            </span>
            <span className="muted wc-summary">{weather?.summary ?? "Reading today's weather…"}</span>
          </div>
        </div>
        <span className="badge badge--accent wc-badge">Today</span>
      </div>

      <div className="wc-chips">
        {CHIPS.map((c) => {
          const isActive = active === c.condition;
          return (
            <button
              key={c.condition}
              type="button"
              className={`wc-chip${isActive ? " wc-chip--active" : ""}`}
              onClick={() => pick(c.condition)}
              disabled={!!busy}
              aria-pressed={isActive}
            >
              <span className="wc-chip-icon">{c.icon}</span>
              <span>{busy === c.condition ? "…" : c.label}</span>
            </button>
          );
        })}
      </div>

      <p className="muted wc-help">
        Weather sets the best mode of transport for the day — rain and snow prefer trains, metro and buses.
      </p>
    </div>
  );
}

const css = `
.wc { gap: var(--space-3); padding: var(--space-4); }
.wc-head { align-items: flex-start; }
.wc-now { gap: var(--space-3); align-items: center; }
.wc-now-icon { font-size: 1.8rem; line-height: 1; }
.wc-now-text { gap: 2px; }
.wc-temp { font-family: var(--font-display); font-weight: 700; font-size: 1.15rem; display: inline-flex; align-items: baseline; gap: var(--space-2); }
.wc-cond { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-muted); }
.wc-summary { font-size: 0.85rem; }
.wc-badge { flex: none; }
.wc-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
.wc-chip {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 10px; border-radius: var(--radius-sm);
  background: var(--bg-overlay); border: 1px solid var(--line);
  color: var(--fg-muted); font-family: var(--font-display); font-weight: 600; font-size: 0.85rem;
  cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.1s;
}
.wc-chip:hover:not(:disabled) { color: var(--fg); border-color: var(--accent); transform: translateY(-1px); }
.wc-chip:disabled { cursor: default; opacity: 0.6; }
.wc-chip--active {
  color: var(--accent-2); border-color: var(--accent-2);
  background: linear-gradient(180deg, rgba(251,191,36,0.12), transparent);
}
.wc-chip-icon { font-size: 1rem; line-height: 1; }
.wc-help { margin: 0; font-size: 0.78rem; }
@media (max-width: 420px) { .wc-chips { grid-template-columns: repeat(2, 1fr); } }
`;
