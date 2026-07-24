"use client";

// HSL journey planner. Build an itinerary of >= 2 destinations (HSL zones A–C),
// route via the live Digitransit HSL GraphQL API (with offline graph fallback),
// biased by today's weather, and draw real leg geometry on the Digitransit map.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { JourneyResult, StopLite } from "@/lib/hsl/types";
import WeatherControl from "./WeatherControl";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-skeleton">Loading HSL map…</div>,
});

const MODE_META: Record<string, { icon: string; label: string; color: string }> = {
  SUBWAY: { icon: "Ⓜ", label: "Metro", color: "#ff6319" },
  RAIL: { icon: "🚆", label: "Train", color: "#8c4799" },
  TRAM: { icon: "🚋", label: "Tram", color: "#00985f" },
  BUS: { icon: "🚌", label: "Bus", color: "#007ac9" },
  FERRY: { icon: "⛴", label: "Ferry", color: "#00b9e4" },
  WALK: { icon: "🚶", label: "Walk", color: "#8a94a6" },
};

function mins(s: number): string {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export default function JourneyPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StopLite[]>([]);
  const [itinerary, setItinerary] = useState<StopLite[]>([]);
  const [result, setResult] = useState<JourneyResult | null>(null);
  const [planning, setPlanning] = useState(false);
  const [openList, setOpenList] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // debounced autocomplete
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stops?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data.stops) ? data.stops : []);
        setOpenList(true);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenList(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const addStop = useCallback((s: StopLite) => {
    setItinerary((prev) => (prev.some((p) => p.id === s.id) ? prev : [...prev, s]));
    setQuery("");
    setSuggestions([]);
    setOpenList(false);
    setResult(null);
  }, []);

  const removeStop = (id: string) => {
    setItinerary((prev) => prev.filter((p) => p.id !== id));
    setResult(null);
  };
  const move = (i: number, dir: -1 | 1) => {
    setItinerary((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setResult(null);
  };

  const canPlan = itinerary.length >= 2;

  const plan = useCallback(async () => {
    if (!canPlan) return;
    setPlanning(true);
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinations: itinerary }),
      });
      setResult(await res.json());
    } catch {
      setResult({
        ok: false,
        error: "Could not reach the router.",
        destinations: itinerary,
        segments: [],
        totalSeconds: 0,
        weather: { date: "", condition: "", tempC: 0, precipitationMm: 0, windKmh: 0, summary: "" },
        preference: { rain: false, preferredModes: [], avoid: [], message: "" },
      });
    } finally {
      setPlanning(false);
    }
  }, [canPlan, itinerary]);

  // Flipping the day's weather re-plans so the rain→transport bias updates live.
  const onWeatherChange = useCallback(() => {
    if (canPlan) plan();
  }, [canPlan, plan]);

  const mapDestinations = useMemo(
    () => (result?.ok ? result.destinations : itinerary),
    [result, itinerary],
  );

  return (
    <main className="page">
      <div className="container jp">
        <style>{css}</style>

        <header className="stack rise rise-1" style={{ gap: "var(--space-2)" }}>
          <span className="badge badge--accent">HSL region · zones A–C</span>
          <h1 style={{ marginBottom: 0 }}>Plan your HSL journey</h1>
          <p className="muted" style={{ marginBottom: 0, maxWidth: 640 }}>
            Add at least two stops. We find the best path across HSL trains, metro, trams,
            buses and ferries — and adjust it to today&apos;s weather.
          </p>
        </header>

        <div className="jp-grid">
          {/* left: builder + results */}
          <div className="stack" style={{ gap: "var(--space-5)" }}>
            <WeatherControl onChange={onWeatherChange} />
            <div className="card rise rise-2 stack" style={{ gap: "var(--space-4)" }}>
              <div className="stack" style={{ gap: "var(--space-2)", position: "relative" }} ref={boxRef}>
                <span className="muted jp-label">Add a destination</span>
                <input
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => suggestions.length && setOpenList(true)}
                  placeholder="Search HSL stops — e.g. Kamppi, Pasila, Lentoasema…"
                />
                {openList && suggestions.length > 0 && (
                  <div className="jp-suggest">
                    {suggestions.map((s) => (
                      <button key={s.id} className="jp-suggest-item" onClick={() => addStop(s)}>
                        <span className="jp-mode-dot" style={{ background: MODE_META[s.mode ?? "BUS"]?.color ?? "#007ac9" }} />
                        <span className="jp-suggest-name">{s.name}</span>
                        {s.code && <span className="jp-code" title="HSL stop code">{s.code}</span>}
                        <span className="badge">{s.zone ? `Zone ${s.zone}` : "HSL"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {itinerary.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>No stops yet. Add two or more to plan a route.</p>
              ) : (
                <ol className="jp-itinerary">
                  {itinerary.map((s, i) => (
                    <li key={s.id} className="jp-stop">
                      <span className="jp-badge">{String.fromCharCode(65 + i)}</span>
                      <span className="jp-stop-name">
                        {s.name}
                        {s.code && <span className="jp-code" title="HSL stop code">{s.code}</span>}
                        <span className="muted"> · Zone {s.zone}</span>
                      </span>
                      <span className="jp-stop-actions">
                        <button className="jp-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="up">↑</button>
                        <button className="jp-icon" onClick={() => move(i, 1)} disabled={i === itinerary.length - 1} aria-label="down">↓</button>
                        <button className="jp-icon" onClick={() => removeStop(s.id)} aria-label="remove">✕</button>
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              <button className="btn btn--lg" disabled={!canPlan || planning} onClick={plan}>
                {planning ? "Routing…" : "⚡ Plan the best route"}
              </button>
              {!canPlan && itinerary.length === 1 && (
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>Add one more destination.</p>
              )}
            </div>

            {result && !result.ok && (
              <div className="card" style={{ borderColor: "var(--danger)" }}>
                <strong style={{ color: "var(--danger)" }}>{result.error}</strong>
              </div>
            )}

            {result?.ok && (
              <div className="stack rise" style={{ gap: "var(--space-4)" }}>
                {/* weather-driven advice */}
                <div className={`jp-weather ${result.preference.rain ? "jp-weather--rain" : ""}`}>
                  <span className="jp-weather-icon">{result.preference.rain ? "🌧️" : "☀️"}</span>
                  <p style={{ margin: 0 }}>{result.preference.message}</p>
                </div>

                <div className="spread">
                  <h2 style={{ margin: 0 }}>Total {mins(result.totalSeconds)}</h2>
                  <span className="badge badge--accent">{result.segments.length} leg{result.segments.length > 1 ? "s" : ""}</span>
                </div>

                {result.fare && (
                  <div className="jp-fare">
                    <span className="jp-fare-ticket">{result.fare.ticket}</span>
                    <div style={{ flex: 1 }}>
                      <strong>€{result.fare.priceEUR.toFixed(2)} · {result.fare.ticket} ticket</strong>
                      <p className="muted" style={{ margin: 0, fontSize: "0.83rem" }}>
                        {result.fare.description} · valid {result.fare.validityMinutes} min · zones {result.fare.zonesTouched.join("")}
                      </p>
                    </div>
                  </div>
                )}

                {result.segments.map((seg, si) => (
                  <div key={si} className="card stack" style={{ gap: "var(--space-3)" }}>
                    <div className="spread">
                      <strong>{seg.fromName} → {seg.toName}</strong>
                      <span className="muted">{mins(seg.seconds)}</span>
                    </div>
                    <div className="stack" style={{ gap: "var(--space-2)" }}>
                      {seg.legs.map((leg, li) => {
                        const m = MODE_META[leg.mode] ?? MODE_META.BUS;
                        return (
                          <div key={li} className="jp-leg">
                            <span className="jp-leg-icon" style={{ background: m.color }}>{m.icon}</span>
                            <span className="jp-leg-text">
                              {leg.kind === "walk" ? (
                                <>Walk {leg.walkMeters ? `${Math.round(leg.walkMeters)} m` : ""} to {leg.to.name}</>
                              ) : (
                                <>
                                  <strong>{m.label} {leg.routeShortName ?? ""}</strong>{" "}
                                  {leg.numStops} stop{(leg.numStops ?? 1) > 1 ? "s" : ""} · {leg.from.name} → {leg.to.name}
                                </>
                              )}
                            </span>
                            <span className="muted jp-leg-time">{mins(leg.seconds)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* right: map */}
          <div className="jp-map card rise rise-3">
            <MapView
              destinations={mapDestinations}
              segments={result?.ok ? result.segments : []}
              bounds={result?.ok ? result.bounds : undefined}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

const css = `
.jp { max-width: 1180px; }
.jp-grid { display: grid; grid-template-columns: minmax(360px, 1fr) minmax(420px, 1.15fr); gap: var(--space-6); margin-top: var(--space-6); align-items: start; }
@media (max-width: 900px) { .jp-grid { grid-template-columns: 1fr; } }
.jp-label { font-size: 0.78rem; font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.05em; }
.jp-suggest { position: absolute; top: 100%; left: 0; right: 0; margin-top: 6px; background: var(--bg-overlay); border: 1px solid var(--line); border-radius: var(--radius-sm); box-shadow: var(--shadow); z-index: 20; overflow: hidden; }
.jp-suggest-item { display: flex; align-items: center; gap: var(--space-3); width: 100%; text-align: left; padding: 10px 14px; background: none; border: none; color: var(--fg); cursor: pointer; }
.jp-suggest-item:hover { background: var(--bg-raised); }
.jp-suggest-name { flex: 1; }
.jp-code { font-family: var(--font-mono, ui-monospace, "SF Mono", Menlo, monospace); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em; color: var(--fg-muted); background: var(--bg-raised); border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; flex: none; white-space: nowrap; }
.jp-mode-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.jp-itinerary { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.jp-stop { display: flex; align-items: center; gap: var(--space-3); background: var(--bg-overlay); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 8px 12px; }
.jp-stop-name { flex: 1; }
.jp-badge { width: 24px; height: 24px; border-radius: 50%; background: var(--accent); color: #06281c; font-family: var(--font-display); font-weight: 700; font-size: 0.8rem; display: grid; place-items: center; flex: none; }
.jp-stop-actions { display: flex; gap: 4px; }
.jp-icon { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg-raised); color: var(--fg-muted); cursor: pointer; }
.jp-icon:hover:not(:disabled) { color: var(--fg); border-color: var(--accent); }
.jp-icon:disabled { opacity: 0.35; cursor: default; }
.jp-weather { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius); background: var(--bg-raised); border: 1px solid var(--line); }
.jp-weather--rain { border-color: var(--accent-2); background: linear-gradient(180deg, rgba(251,191,36,0.08), transparent); }
.jp-weather-icon { font-size: 1.5rem; line-height: 1; }
.jp-fare { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius); background: var(--bg-raised); border: 1px solid var(--accent-2); }
.jp-fare-ticket { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; letter-spacing: 0.06em; color: #2b1d00; background: var(--accent-2); border-radius: var(--radius-sm); padding: 6px 12px; flex: none; }
.jp-leg { display: flex; align-items: center; gap: var(--space-3); }
.jp-leg-icon { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; font-size: 0.95rem; flex: none; color: #fff; }
.jp-leg-text { flex: 1; font-size: 0.92rem; }
.jp-leg-time { font-size: 0.82rem; white-space: nowrap; }
.jp-map { padding: 0; overflow: hidden; position: sticky; top: 90px; height: 620px; }
.jp-map > div { height: 100%; }
.map-skeleton { display: grid; place-items: center; height: 100%; min-height: 460px; color: var(--fg-muted); }
`;
