"use client";

// Discovery showpiece — minimal-input controls, ranked destination cards.
// POSTs to /api/discover; codes defensively around the (parallel-built) route
// and around any missing fields on DestinationCandidate.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DestinationCandidate, BudgetBand } from "@/features/discovery/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BUDGET_BANDS: { key: BudgetBand; label: string; emoji: string }[] = [
  { key: "shoestring", label: "Shoestring", emoji: "🎒" },
  { key: "mid", label: "Mid", emoji: "💳" },
  { key: "comfortable", label: "Comfortable", emoji: "🛋️" },
  { key: "luxury", label: "Luxury", emoji: "🥂" },
];

type Loadable =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; results: DestinationCandidate[] }
  | { status: "error"; message: string };

function clampScore(n: unknown): number {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return Math.max(0, Math.min(1, v));
}

function safetyBadge(rating: string | undefined): { cls: string; label: string } {
  switch (rating) {
    case "low":
      return { cls: "badge--accent", label: "Safe" };
    case "elevated":
      return { cls: "dc-badge-danger", label: "Elevated" };
    case "moderate":
    default:
      return { cls: "badge--amber", label: "Moderate" };
  }
}

export default function DiscoverClient({
  vibe,
  hasProfile,
}: {
  vibe: string;
  hasProfile: boolean;
}) {
  const [budgetBand, setBudgetBand] = useState<BudgetBand | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [state, setState] = useState<Loadable>({ status: "idle" });
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const runDiscovery = useCallback(
    async (opts?: { surprise?: boolean }) => {
      setState({ status: "loading" });
      const body: Record<string, unknown> = { vibe };
      if (!opts?.surprise) {
        if (budgetBand) body.budgetBand = budgetBand;
        if (month) body.month = month;
      }
      try {
        const res = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          /* non-JSON response */
        }
        const results = Array.isArray(data)
          ? data
          : Array.isArray((data as { results?: unknown })?.results)
            ? (data as { results: unknown[] }).results
            : Array.isArray((data as { destinations?: unknown })?.destinations)
              ? (data as { destinations: unknown[] }).destinations
              : [];
        const clean = (results as DestinationCandidate[]).filter(
          (r) => r && typeof r.name === "string",
        );
        setState({ status: "done", results: clean });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Discovery failed",
        });
      }
    },
    [vibe, budgetBand, month],
  );

  // Fetch a default list on first load so the screen is never empty.
  useEffect(() => {
    runDiscovery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSkip(name: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleExpand(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const results = state.status === "done" ? state.results : [];
  const visible = useMemo(
    () => results.filter((r) => !skipped.has(r.name)),
    [results, skipped],
  );

  return (
    <div className="stack" style={{ gap: "var(--space-6)" }}>
      <style>{css}</style>

      <header className="stack rise rise-1" style={{ gap: "var(--space-2)" }}>
        <span className="badge badge--accent">Scout report · {vibe}</span>
        <h1 style={{ marginBottom: 0 }}>Where&apos;s worth going?</h1>
        <p className="muted" style={{ marginBottom: 0, maxWidth: 620 }}>
          Places worth the trip for a first-timer — ranked for your vibe, corroborated
          across real reviews, safety-checked. Tune the two controls or just let us surprise you.
        </p>
      </header>

      {!hasProfile && (
        <div className="card dc-banner rise rise-2">
          <span>
            No manager profile yet — we&apos;re scouting as an{" "}
            <strong>explorer</strong> for now.
          </span>
          <Link href="/onboarding" className="btn btn--ghost">
            Do the 60-second induction →
          </Link>
        </div>
      )}

      {/* Controls */}
      <div className="card rise rise-2 stack" style={{ gap: "var(--space-4)" }}>
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <span className="muted dc-label">Budget band</span>
          <div className="row">
            {BUDGET_BANDS.map((b) => (
              <button
                key={b.key}
                type="button"
                className={`dc-chip ${budgetBand === b.key ? "dc-chip--on" : ""}`}
                onClick={() =>
                  setBudgetBand((cur) => (cur === b.key ? null : b.key))
                }
              >
                <span aria-hidden>{b.emoji}</span> {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="spread" style={{ alignItems: "flex-end", gap: "var(--space-4)" }}>
          <div className="stack" style={{ gap: "var(--space-2)", flex: "1 1 200px" }}>
            <span className="muted dc-label">Travel month</span>
            <select
              className="input"
              value={month ?? ""}
              onChange={(e) =>
                setMonth(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Any month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: "var(--space-3)" }}>
            <button
              type="button"
              className="btn btn--amber"
              onClick={() => runDiscovery({ surprise: true })}
              disabled={state.status === "loading"}
            >
              🎲 Surprise me
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => runDiscovery()}
              disabled={state.status === "loading"}
            >
              {state.status === "loading" ? "Scouting…" : "Find destinations →"}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {state.status === "loading" && (
        <div className="grid grid--2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card dc-skeleton" style={{ minHeight: 220 }} />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className="card dc-banner">
          <span>
            The scouts hit a snag ({state.message}). Try again in a moment.
          </span>
          <button className="btn btn--ghost" onClick={() => runDiscovery()}>
            Retry
          </button>
        </div>
      )}

      {state.status === "done" && visible.length === 0 && (
        <div className="card dc-banner">
          <span>
            {results.length === 0
              ? "No destinations came back — try a different month or budget."
              : "You've skipped every result. Un-skip some below or run a fresh search."}
          </span>
          <button className="btn btn--ghost" onClick={() => setSkipped(new Set())}>
            Reset filter
          </button>
        </div>
      )}

      {state.status === "done" && visible.length > 0 && (
        <div className="grid grid--2">
          {visible.map((d, i) => {
            const fit = clampScore(d.fitScore);
            const conf = clampScore(d.confidence);
            const badge = safetyBadge(d.safety?.rating);
            const isOpen = expanded.has(d.name);
            const sources = Array.isArray(d.sources) ? d.sources : [];
            const why = Array.isArray(d.whyWorthIt) ? d.whyWorthIt : [];
            const planHref = `/plan?dest=${encodeURIComponent(d.name)}`;

            return (
              <article
                key={d.name}
                className={`card dc-card rise rise-${Math.min(i + 1, 4)}`}
              >
                <div className="spread" style={{ alignItems: "flex-start" }}>
                  <div className="row" style={{ gap: "var(--space-3)" }}>
                    <span className="dc-emoji" aria-hidden>
                      {d.emoji ?? "📍"}
                    </span>
                    <div>
                      <h3 style={{ marginBottom: 2 }}>{d.name}</h3>
                      {d.tagline && (
                        <span className="muted dc-tagline">{d.tagline}</span>
                      )}
                    </div>
                  </div>
                  <div
                    className="dc-ring"
                    style={
                      {
                        "--pct": `${Math.round(fit * 100)}`,
                      } as React.CSSProperties
                    }
                    title={`Fit score ${Math.round(fit * 100)}%`}
                  >
                    <span>{Math.round(fit * 100)}</span>
                  </div>
                </div>

                <div className="row" style={{ margin: "var(--space-3) 0" }}>
                  <span className={`badge ${badge.cls}`}>🛡 {badge.label}</span>
                  {d.bestWindow && (
                    <span className="badge">📅 {d.bestWindow}</span>
                  )}
                  {typeof d.estDailyBudget === "number" && (
                    <span className="badge badge--amber">
                      ~{Math.round(d.estDailyBudget)}/day
                    </span>
                  )}
                </div>

                {why.length > 0 && (
                  <ul className="dc-why">
                    {why.slice(0, 4).map((w, wi) => (
                      <li key={wi}>{w}</li>
                    ))}
                  </ul>
                )}

                {d.reviewSummary && (
                  <p className="muted dc-review">“{d.reviewSummary}”</p>
                )}

                <div className="dc-conf">
                  <div className="spread" style={{ marginBottom: 4 }}>
                    <span className="muted dc-label">Confidence</span>
                    <span className="muted dc-label">
                      {Math.round(conf * 100)}%
                    </span>
                  </div>
                  <div className="dc-bar">
                    <div
                      className="dc-bar__fill"
                      style={{ width: `${Math.round(conf * 100)}%` }}
                    />
                  </div>
                </div>

                {sources.length > 0 && (
                  <div className="dc-sources">
                    <button
                      type="button"
                      className="dc-disclose"
                      onClick={() => toggleExpand(d.name)}
                    >
                      {isOpen ? "▾" : "▸"} {sources.length} source
                      {sources.length === 1 ? "" : "s"}
                    </button>
                    {isOpen && (
                      <ul className="dc-source-list">
                        {sources.map((s, si) => (
                          <li key={si}>
                            <a href={s} target="_blank" rel="noreferrer">
                              {prettyUrl(s)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div
                  className="spread dc-actions"
                  style={{ marginTop: "var(--space-4)" }}
                >
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => toggleSkip(d.name)}
                  >
                    Skip
                  </button>
                  <Link href={planHref} className="btn">
                    Plan this →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function prettyUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

const css = `
.dc-label { font-size: 0.78rem; font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.06em; }
.dc-banner { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; border-color: var(--accent-2); }

.dc-chip {
  font-family: var(--font-display); font-weight: 600; font-size: 0.85rem;
  color: var(--fg); background: var(--bg-overlay);
  border: 1px solid var(--line); border-radius: 999px;
  padding: 8px 16px; cursor: pointer; transition: all 0.15s ease;
}
.dc-chip:hover { border-color: var(--accent); }
.dc-chip--on {
  background: linear-gradient(90deg, rgba(52,211,153,0.18), var(--bg-overlay));
  border-color: var(--accent); color: var(--accent);
}

.dc-card { display: flex; flex-direction: column; }
.dc-emoji { font-size: 2rem; line-height: 1; flex: none; }
.dc-tagline { font-size: 0.85rem; }

.dc-ring {
  --pct: 0; flex: none; width: 56px; height: 56px; border-radius: 50%;
  display: grid; place-items: center; position: relative;
  background: conic-gradient(var(--accent) calc(var(--pct) * 1%), var(--line) 0);
}
.dc-ring::before {
  content: ""; position: absolute; inset: 5px; border-radius: 50%; background: var(--bg-raised);
}
.dc-ring span {
  position: relative; font-family: var(--font-display); font-weight: 700;
  font-size: 1.05rem; color: var(--accent);
}

.dc-badge-danger { color: var(--danger); border-color: var(--danger); }

.dc-why { margin: 0 0 var(--space-3); padding-left: 1.1rem; display: flex; flex-direction: column; gap: 4px; }
.dc-why li { font-size: 0.9rem; }
.dc-review { font-size: 0.88rem; font-style: italic; margin-bottom: var(--space-3); }

.dc-conf { margin-top: auto; }
.dc-bar { height: 6px; border-radius: 999px; background: var(--bg-overlay); border: 1px solid var(--line); overflow: hidden; }
.dc-bar__fill { height: 100%; background: linear-gradient(90deg, var(--accent-2), var(--accent)); border-radius: 999px; }

.dc-sources { margin-top: var(--space-3); }
.dc-disclose { background: none; border: none; color: var(--fg-muted); font-family: var(--font-display); font-size: 0.8rem; cursor: pointer; padding: 0; }
.dc-disclose:hover { color: var(--accent); }
.dc-source-list { margin: 6px 0 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 2px; }
.dc-source-list li { font-size: 0.8rem; }

.dc-actions { border-top: 1px solid var(--line); padding-top: var(--space-4); }

@keyframes dc-shimmer { 0% { opacity: 0.4; } 50% { opacity: 0.7; } 100% { opacity: 0.4; } }
.dc-skeleton { animation: dc-shimmer 1.4s ease-in-out infinite; }
`;
