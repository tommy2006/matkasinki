"use client";

// Expense logger + running total vs the trip budget. Logs via /api/budget and
// refreshes the summary; under-budget projects a club "sponsorship bonus".

import { useState } from "react";
import type { BudgetSummary } from "@/features/budget-tracker";
import { formatMoney } from "@/lib/currency";

const CATEGORY_EMOJI: Record<string, string> = {
  food: "🍽️",
  transport: "🚉",
  lodging: "🛏️",
  activities: "🎟️",
  shopping: "🛍️",
  other: "•",
};

export default function BudgetClient({
  home,
  initial,
  currencies,
  categories,
}: {
  home: string;
  initial: BudgetSummary | null;
  currencies: string[];
  categories: string[];
}) {
  const [summary, setSummary] = useState<BudgetSummary | null>(initial);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currencies.includes("EUR") ? "EUR" : currencies[0]);
  const [category, setCategory] = useState(categories[0] ?? "other");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/budget", { method: "GET" });
      const data = await res.json().catch(() => null);
      const next: BudgetSummary | undefined = data?.summary ?? data;
      if (next?.expenses) setSummary(next);
    } catch {
      /* keep current summary */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, currency, category, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not log the expense");
      const next: BudgetSummary | undefined = data?.summary;
      if (next?.expenses) setSummary(next);
      else await refresh();
      setAmount("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const pct = summary?.pctUsed ?? 0;
  const overBudget = summary?.budget != null && !summary.underBudget;
  const barColor = overBudget ? "var(--danger)" : pct > 80 ? "var(--accent-2)" : "var(--accent)";

  return (
    <div className="stack">
      <div className="stack rise rise-1" style={{ gap: "var(--space-2)" }}>
        <h1>Budget</h1>
        <p className="muted">
          Log spends in any currency — converted live to {home}. Stay under and your club banks a
          sponsorship bonus.
          {summary?.destination ? ` Trip: ${summary.destination}.` : ""}
        </p>
      </div>

      <div className="grid grid--2 rise rise-2">
        <form className="card stack" onSubmit={submit}>
          <h3 style={{ margin: 0 }}>Log an expense</h3>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ flex: 2 }}
            />
            <select
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ flex: 1 }}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_EMOJI[c] ?? "•"} {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="row">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Logging…" : "Log expense"}
            </button>
            {error && <span className="badge badge--amber">{error}</span>}
          </div>
        </form>

        <div className="card stack">
          <div className="spread">
            <h3 style={{ margin: 0 }}>Spent</h3>
            {summary && (
              summary.ratesLive ? (
                <span className="badge badge--accent">● Live rates</span>
              ) : (
                <span className="badge">Static rates</span>
              )
            )}
          </div>
          <div className="row" style={{ alignItems: "baseline", gap: "var(--space-2)" }}>
            <strong style={{ fontSize: "2.2rem", fontFamily: "var(--font-display)" }}>
              {formatMoney(summary?.total ?? 0, home)}
            </strong>
            {summary?.budget != null && (
              <span className="muted">/ {formatMoney(summary.budget, home)} budget</span>
            )}
          </div>
          {summary?.budget != null && (
            <>
              <div
                style={{
                  width: "100%",
                  height: 10,
                  borderRadius: 999,
                  background: "var(--bg-overlay)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    height: "100%",
                    background: barColor,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div className="spread">
                <span className="muted">{pct}% used</span>
                <span className={overBudget ? "badge badge--amber" : "badge badge--accent"}>
                  {overBudget
                    ? `Over by ${formatMoney(Math.abs(summary.remaining ?? 0), home)}`
                    : `${formatMoney(summary.remaining ?? 0, home)} left`}
                </span>
              </div>
            </>
          )}
          {summary?.underBudget && summary.sponsorshipBonus != null && summary.sponsorshipBonus > 0 && (
            <div className="card glow" style={{ background: "var(--bg-overlay)", border: "1px solid var(--accent-2)" }}>
              <div className="row">
                <span aria-hidden style={{ fontSize: "1.4rem" }}>🏆</span>
                <div className="stack" style={{ gap: 2 }}>
                  <strong>Sponsorship bonus incoming</strong>
                  <span className="muted" style={{ fontSize: "0.9rem" }}>
                    Staying under books your club <strong>{formatMoney(summary.sponsorshipBonus, home)}</strong> in
                    transfer funds.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {summary && Object.keys(summary.byCategory).length > 0 && (
        <div className="card stack rise rise-3">
          <h3 style={{ margin: 0 }}>By category</h3>
          <div className="grid grid--3">
            {Object.entries(summary.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => (
                <div key={cat} className="stack" style={{ gap: 2 }}>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    {CATEGORY_EMOJI[cat] ?? "•"} {cat}
                  </span>
                  <strong style={{ fontFamily: "var(--font-display)" }}>{formatMoney(amt, home)}</strong>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="card stack rise rise-4">
        <h3 style={{ margin: 0 }}>Receipts</h3>
        {summary && summary.expenses.length > 0 ? (
          <div className="stack" style={{ gap: "var(--space-2)" }}>
            {[...summary.expenses].reverse().map((e) => (
              <div key={e.index} className="spread" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                <div className="row">
                  <span className="badge">{CATEGORY_EMOJI[e.category] ?? "•"} {e.category}</span>
                  {e.note && <span className="muted">{e.note}</span>}
                </div>
                <div className="row">
                  <span className="muted">{formatMoney(e.amount, e.currency)}</span>
                  <strong>{formatMoney(e.homeAmount, home)}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>No expenses logged yet.</p>
        )}
      </div>
    </div>
  );
}
