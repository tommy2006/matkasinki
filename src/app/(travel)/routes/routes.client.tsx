"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LocalRoutePlan } from "@/features/local-routes/types";
import RouteChat from "@/components/routes/RouteChat";
import RouteSteps from "@/components/routes/RouteSteps";

const TravelMap = dynamic(() => import("@/components/routes/TravelMap"), {
  ssr: false,
  loading: () => <div className="routes-map-wrap routes-map-wrap--loading card">Loading map…</div>,
});

function RoutesInner() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("id");
  const [plan, setPlan] = useState<LocalRoutePlan | null>(null);

  const loadById = useCallback(async (id: string) => {
    const res = await fetch(`/api/routes?id=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { plan?: LocalRoutePlan };
    if (data.plan) setPlan(data.plan);
  }, []);

  useEffect(() => {
    if (planId) void loadById(planId);
  }, [planId, loadById]);

  return (
    <main className="page">
      <div className="container routes-page">
        <style>{css}</style>

        <header className="stack rise rise-1" style={{ gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
          <span className="badge badge--accent">Local routes</span>
          <h1 style={{ marginBottom: 0 }}>Helsinki day planner</h1>
          <p className="muted" style={{ marginBottom: 0, maxWidth: 640 }}>
            Real HSL transit, OpenStreetMap, and an agent that picks sights, museums, and dinner spots — then routes you between them.
          </p>
        </header>

        <div className="routes-layout rise rise-2">
          <div className="routes-layout__chat">
            <RouteChat onPlanChange={setPlan} />
          </div>
          <div className="routes-layout__map stack" style={{ gap: "var(--space-4)" }}>
            <Suspense fallback={<div className="card routes-map-wrap">Loading map…</div>}>
              <TravelMap plan={plan} />
            </Suspense>
            <RouteSteps plan={plan} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RoutesClient() {
  return (
    <Suspense fallback={<main className="page"><div className="container" /></main>}>
      <RoutesInner />
    </Suspense>
  );
}

const css = `
.routes-page { max-width: 1200px; }
.routes-layout {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.2fr);
  gap: var(--space-5);
  align-items: stretch;
  min-height: 520px;
}
@media (max-width: 900px) {
  .routes-layout { grid-template-columns: 1fr; }
}
.routes-layout__chat { min-height: 480px; display: flex; flex-direction: column; }
.routes-layout__map { min-height: 400px; }
.routes-map-wrap {
  height: 360px;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--line);
}
.routes-map-wrap--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-muted);
}
.routes-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--bg);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-raised);
  box-shadow: var(--shadow-soft);
}
.routes-chat { min-height: 480px; }
.routes-chat__messages { min-height: 200px; max-height: 320px; }
.routes-chat__msg { padding: var(--space-3); border-radius: var(--radius-sm); background: var(--bg-overlay); }
.routes-chat__msg--user { border-left: 3px solid var(--accent-2); }
.routes-chat__msg--assistant { border-left: 3px solid var(--accent); }
.routes-chat__role { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-muted); display: block; margin-bottom: 4px; }
.routes-chat__text { font-size: 0.92rem; white-space: pre-wrap; }
.routes-chat__input { resize: vertical; min-height: 72px; font-family: inherit; }
.routes-error { color: var(--danger); margin: 0; font-size: 0.88rem; }
.routes-stops, .routes-legs { margin: 0; padding-left: 1.2rem; }
.routes-legs { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
.routes-leg { display: flex; gap: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--line); }
.routes-leg:first-child { border-top: none; padding-top: 0; }
.routes-leg__mode { flex: none; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--accent); width: 52px; }
.routes-leg__body { display: flex; flex-direction: column; gap: 2px; font-size: 0.9rem; }
.routes-leg__meta { font-size: 0.8rem; }
.routes-steps--empty { min-height: 80px; }
`;
