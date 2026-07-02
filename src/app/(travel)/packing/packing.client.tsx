"use client";

// Forecast-driven categorized checklist. Checkboxes persist in component state;
// "Refresh with latest forecast" re-generates the list via /api/packing.

import { useMemo, useState } from "react";
import type { PackCategory, PackingList } from "@/features/packing-list";

const CATEGORY_META: Record<PackCategory, { label: string; emoji: string }> = {
  documents: { label: "Documents", emoji: "🛂" },
  clothing: { label: "Clothing", emoji: "👕" },
  tech: { label: "Tech", emoji: "🔌" },
  health: { label: "Health", emoji: "🩹" },
  extras: { label: "Extras", emoji: "🎒" },
};

const ORDER: PackCategory[] = ["documents", "clothing", "tech", "health", "extras"];

export default function PackingClient({
  destination,
  dates,
  initial,
}: {
  destination: string;
  dates: { start: string; end: string };
  initial: PackingList | null;
}) {
  const [list, setList] = useState<PackingList | null>(initial);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, PackingList["items"]> = {};
    for (const it of list?.items ?? []) (g[it.category] ??= []).push(it);
    return g;
  }, [list]);

  const total = list?.items.length ?? 0;
  const packed = Object.values(checked).filter(Boolean).length;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, dates }),
      });
      const data = await res.json().catch(() => null);
      const next: PackingList | undefined = data?.list ?? data;
      if (!res.ok || !next?.items) throw new Error(data?.error ?? "Could not refresh the forecast");
      setList(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const digest = list?.digest;

  return (
    <div className="stack">
      <div className="stack rise rise-1" style={{ gap: "var(--space-2)" }}>
        <h1>Packing list</h1>
        <p className="muted">
          Sized to the real forecast for {destination} · {dates.start} → {dates.end}. Every
          weather-driven item explains why it made the cut.
        </p>
      </div>

      {digest && (
        <div className="card rise rise-2 stack">
          <div className="spread">
            <h3 style={{ margin: 0 }}>Weather digest</h3>
            <div className="row">
              {list?.forecast.live ? (
                <span className="badge badge--accent">● Live forecast</span>
              ) : (
                <span className="badge">Estimated forecast</span>
              )}
              {digest.estimatedDays > 0 && (
                <span className="badge">{digest.estimatedDays} climate-typical day(s)</span>
              )}
            </div>
          </div>
          <div className="grid grid--3">
            <Stat label="Nights" value={`${digest.nights}`} />
            <Stat label="Temp range" value={`${digest.tMin}–${digest.tMax}°C`} />
            <Stat label="Rain days" value={`${digest.rainDays}`} />
            <Stat label="Hot days (28°C+)" value={`${digest.hotDays}`} />
            <Stat label="Cold days (<10°C)" value={`${digest.coldDays}`} />
          </div>
        </div>
      )}

      <div className="card rise rise-3 spread">
        <div className="row">
          <span className="badge badge--amber">
            {packed} / {total} packed
          </span>
          <div
            style={{
              width: 200,
              height: 8,
              borderRadius: 999,
              background: "var(--bg-overlay)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: total ? `${(packed / total) * 100}%` : "0%",
                height: "100%",
                background: "var(--accent)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
        <div className="row">
          {error && <span className="badge badge--amber">{error}</span>}
          <button className="btn btn--amber" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "↻ Refresh with latest forecast"}
          </button>
        </div>
      </div>

      <div className="stack rise rise-4">
        {ORDER.filter((c) => grouped[c]?.length).map((cat) => (
          <div key={cat} className="card stack">
            <h3 style={{ margin: 0 }}>
              {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
            </h3>
            <div className="stack" style={{ gap: "var(--space-2)" }}>
              {grouped[cat].map((it) => (
                <label
                  key={it.id}
                  className="row"
                  style={{ cursor: "pointer", alignItems: "flex-start", flexWrap: "nowrap" }}
                >
                  <input
                    type="checkbox"
                    checked={!!checked[it.id]}
                    onChange={(e) => setChecked((c) => ({ ...c, [it.id]: e.target.checked }))}
                    style={{ marginTop: 4, accentColor: "var(--accent)", width: 18, height: 18 }}
                  />
                  <span className="stack" style={{ gap: 2 }}>
                    <span style={{ opacity: checked[it.id] ? 0.5 : 1 }}>
                      {it.name}
                      {it.qty ? <span className="muted"> ×{it.qty}</span> : null}
                    </span>
                    {it.reason && (
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        {it.reason}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!list && !loading && (
        <div className="card muted">No list yet — hit refresh to pull the latest forecast.</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <span className="muted" style={{ fontSize: "0.8rem" }}>{label}</span>
      <strong style={{ fontSize: "1.3rem", fontFamily: "var(--font-display)" }}>{value}</strong>
    </div>
  );
}
