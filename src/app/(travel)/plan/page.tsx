"use client";

// /plan — introvert-friendly itinerary builder. Destination prefilled from
// ?dest=. Two dates + a budget slider + one button. Days render as cards with
// a per-day Swap. "Save trip" persists. Codes defensively around /api/plan
// (built in parallel) and any itinerary shape it returns.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface DayItem {
  time?: string;
  title?: string;
  notes?: string;
}
interface PlanDay {
  day?: number;
  date?: string;
  theme?: string;
  title?: string;
  items?: DayItem[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

function todayISO(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Best-effort normaliser: accept several plausible itinerary shapes. */
function toDays(data: unknown): PlanDay[] {
  if (!data) return [];
  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as { itinerary?: unknown }).itinerary)
      ? (data as { itinerary: unknown[] }).itinerary
      : Array.isArray((data as { days?: unknown }).days)
        ? (data as { days: unknown[] }).days
        : Array.isArray(
              (data as { itinerary?: { days?: unknown } }).itinerary?.days,
            )
          ? ((data as { itinerary: { days: unknown[] } }).itinerary.days)
          : [];
  return (raw as PlanDay[])
    .filter((d) => d && typeof d === "object")
    .map((d, i) => ({
      day: typeof d.day === "number" ? d.day : i + 1,
      date: typeof d.date === "string" ? d.date : undefined,
      theme: d.theme ?? d.title,
      items: Array.isArray(d.items)
        ? d.items.filter((it) => it && typeof it === "object")
        : [],
    }));
}

function PlanInner() {
  const searchParams = useSearchParams();
  const initialDest = searchParams.get("dest") ?? "";

  const [destination, setDestination] = useState(initialDest);
  const [start, setStart] = useState(todayISO(14));
  const [end, setEnd] = useState(todayISO(18));
  const [budget, setBudget] = useState(120);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [swapSalts, setSwapSalts] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (initialDest) setDestination(initialDest);
  }, [initialDest]);

  const bodyBase = useMemo(
    () => ({
      destination,
      dates: { start, end },
      budget,
    }),
    [destination, start, end, budget],
  );

  const post = useCallback(async (extra: Record<string, unknown>) => {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extra),
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON */
    }
    if (!res.ok) {
      const msg =
        (data as { error?: string })?.error ?? `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }, []);

  const generate = useCallback(async () => {
    if (!destination.trim()) {
      setError("Pick a destination first.");
      return;
    }
    setLoading(true);
    setError(null);
    setSaveState("idle");
    try {
      const data = await post({ ...bodyBase });
      setDays(toDays(data));
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the itinerary.");
    } finally {
      setLoading(false);
    }
  }, [bodyBase, destination, post]);

  const swapDay = useCallback(
    async (index: number) => {
      const target = days[index];
      if (!target) return;
      setSwapping(index);
      setError(null);
      const salt = (swapSalts[index] ?? 0) + 1;
      try {
        const data = await post({
          ...bodyBase,
          action: "swap",
          dayIndex: index,
          date: target.date ?? start,
          salt,
        });
        // /api/plan swap returns a single { day } object.
        const fresh = (data as { day?: PlanDay })?.day;
        if (fresh && typeof fresh === "object") {
          setSwapSalts((prev) => ({ ...prev, [index]: salt }));
          setDays((prev) =>
            prev.map((d, i) =>
              i === index ? { ...fresh, day: d.day ?? i + 1 } : d,
            ),
          );
        }
        setSaveState("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Swap failed.");
      } finally {
        setSwapping(null);
      }
    },
    [bodyBase, days, post, start, swapSalts],
  );

  const save = useCallback(async () => {
    setSaveState("saving");
    try {
      await post({ ...bodyBase, action: "save", itinerary: days });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [bodyBase, days, post]);

  const cityName = destination.split(",")[0].trim();

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <style>{css}</style>

        <header className="stack rise rise-1" style={{ gap: "var(--space-2)" }}>
          <span className="badge badge--accent">Trip planner</span>
          <h1 style={{ marginBottom: 0 }}>
            {cityName ? `Plan ${cityName}` : "Plan your trip"}
          </h1>
          <p className="muted" style={{ marginBottom: 0, maxWidth: 620 }}>
            Two dates, one budget slider, one button. No forms, no fuss — we&apos;ll
            draft a day-by-day itinerary you can reshuffle.
          </p>
          {/helsinki/i.test(destination) && (
            <div className="card" style={{ marginTop: "var(--space-3)", borderColor: "var(--accent)" }}>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                Planning a day in Helsinki with real HSL routes and a map?{" "}
                <Link href="/routes" className="btn btn--ghost" style={{ display: "inline-flex", padding: "4px 12px" }}>
                  Open Helsinki Routes →
                </Link>
              </p>
            </div>
          )}
        </header>

        {/* Controls */}
        <div className="card rise rise-2 stack" style={{ gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
          <div className="stack" style={{ gap: "var(--space-2)" }}>
            <span className="muted pl-label">Destination</span>
            <input
              className="input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Porto, Portugal"
            />
          </div>

          <div className="grid grid--2" style={{ gap: "var(--space-4)" }}>
            <div className="stack" style={{ gap: "var(--space-2)" }}>
              <span className="muted pl-label">Start date</span>
              <input
                type="date"
                className="input"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="stack" style={{ gap: "var(--space-2)" }}>
              <span className="muted pl-label">End date</span>
              <input
                type="date"
                className="input"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="stack" style={{ gap: "var(--space-2)" }}>
            <div className="spread">
              <span className="muted pl-label">Daily budget</span>
              <span className="badge badge--amber">~{budget}/day</span>
            </div>
            <input
              type="range"
              className="pl-range"
              min={30}
              max={500}
              step={10}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>

          <div className="row">
            <button
              className="btn btn--lg glow"
              onClick={generate}
              disabled={loading}
            >
              {loading ? "Drafting…" : generated ? "↻ Regenerate itinerary" : "⚡ Generate itinerary"}
            </button>
            {generated && days.length > 0 && (
              <button
                className="btn btn--amber btn--lg"
                onClick={save}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? "Saving…" : "💾 Save trip"}
              </button>
            )}
          </div>

          {error && <p className="pl-error" style={{ margin: 0 }}>{error}</p>}
          {saveState === "saved" && (
            <p className="muted" style={{ margin: 0, color: "var(--accent)" }}>
              Trip saved — the squad is booked in.
            </p>
          )}
          {saveState === "error" && (
            <p className="pl-error" style={{ margin: 0 }}>
              Couldn&apos;t save the trip. Your itinerary is still here.
            </p>
          )}
        </div>

        {/* Itinerary */}
        {loading && days.length === 0 && (
          <div className="stack" style={{ marginTop: "var(--space-6)", gap: "var(--space-4)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card pl-skeleton" style={{ minHeight: 140 }} />
            ))}
          </div>
        )}

        {days.length > 0 && (
          <div className="stack" style={{ marginTop: "var(--space-6)", gap: "var(--space-5)" }}>
            {days.map((d, i) => (
              <article
                key={d.day ?? i}
                className={`card pl-day rise rise-${Math.min(i + 1, 4)} ${
                  swapping === i ? "pl-day--swapping" : ""
                }`}
              >
                <div className="spread pl-day__head">
                  <div className="row" style={{ gap: "var(--space-3)" }}>
                    <span className="pl-day__num">Day {d.day ?? i + 1}</span>
                    {d.theme && <h3 style={{ margin: 0 }}>{d.theme}</h3>}
                  </div>
                  <button
                    className="btn btn--ghost"
                    onClick={() => swapDay(i)}
                    disabled={swapping !== null}
                  >
                    {swapping === i ? "Swapping…" : "↻ Swap"}
                  </button>
                </div>

                {Array.isArray(d.items) && d.items.length > 0 ? (
                  <ul className="pl-items">
                    {d.items.map((it, ii) => (
                      <li key={ii} className="pl-item">
                        {it.time && <span className="pl-item__time">{it.time}</span>}
                        <div className="pl-item__body">
                          <span className="pl-item__title">{it.title ?? "Free time"}</span>
                          {it.notes && (
                            <span className="muted pl-item__notes">{it.notes}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    A rest day — nothing scheduled.
                  </p>
                )}
              </article>
            ))}

            <div className="card pl-broadcast rise">
              <span>Your itinerary is ready for the cameras.</span>
              <Link href="/broadcast" className="btn btn--amber btn--lg">
                📺 Watch your matchday broadcast →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<main className="page"><div className="container" /></main>}>
      <PlanInner />
    </Suspense>
  );
}

const css = `
.pl-label { font-size: 0.78rem; font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.06em; }
.pl-error { color: var(--danger); font-size: 0.9rem; }

.pl-range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 999px; background: var(--bg-overlay); border: 1px solid var(--line); outline: none; }
.pl-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid var(--bg-raised); cursor: pointer; box-shadow: var(--shadow-soft); }
.pl-range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid var(--bg-raised); cursor: pointer; }

.pl-day__head { margin-bottom: var(--space-4); flex-wrap: wrap; }
.pl-day__num { font-family: var(--font-display); font-weight: 700; color: var(--accent-2); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; }
.pl-day--swapping { opacity: 0.55; }

.pl-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.pl-item { display: flex; gap: var(--space-4); padding: var(--space-3) 0; border-top: 1px solid var(--line); }
.pl-item:first-child { border-top: none; }
.pl-item__time { flex: none; width: 68px; font-family: var(--font-display); font-weight: 600; font-size: 0.85rem; color: var(--accent); padding-top: 2px; }
.pl-item__body { display: flex; flex-direction: column; gap: 2px; }
.pl-item__title { font-weight: 600; }
.pl-item__notes { font-size: 0.88rem; }

.pl-broadcast { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; border-color: var(--accent-2); }

@keyframes pl-shimmer { 0% { opacity: 0.4; } 50% { opacity: 0.7; } 100% { opacity: 0.4; } }
.pl-skeleton { animation: pl-shimmer 1.4s ease-in-out infinite; }
`;
