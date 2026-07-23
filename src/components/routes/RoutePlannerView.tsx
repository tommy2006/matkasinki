"use client";

import "./routes.css";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { LocalRoutePlan } from "@/features/local-routes/types";
import RouteChat from "@/components/routes/RouteChat";
import PlanMapHeader from "@/components/routes/PlanMapHeader";
import RouteSteps from "@/components/routes/RouteSteps";
import DayTabs from "@/components/routes/DayTabs";

const TravelMap = dynamic(() => import("@/components/routes/TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="planner-map__wrap planner-map__wrap--empty">Map</div>
  ),
});

interface RoutePlannerViewProps {
  api?: string;
  layout?: "page" | "chat";
}

function RoutePlannerInner({ api = "/api/chat", layout = "page" }: RoutePlannerViewProps) {
  const searchParams = useSearchParams();
  const planId = searchParams.get("id");
  const [plan, setPlan] = useState<LocalRoutePlan | null>(null);
  const [streaming, setStreaming] = useState(false);
  /** null = whole trip. Reset whenever a new plan lands. */
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const planIdRef = useRef<string | null>(null);

  const handlePlanChange = useCallback((next: LocalRoutePlan | null) => {
    const nextId = next?.id ?? null;
    if (planIdRef.current !== nextId) {
      planIdRef.current = nextId;
      setActiveDay(null);
    }
    setPlan(next);
  }, []);

  const loadById = useCallback(
    async (id: string) => {
      const res = await fetch(`${api}?id=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { plan?: LocalRoutePlan };
      if (data.plan) handlePlanChange(data.plan);
    },
    [api, handlePlanChange],
  );

  useEffect(() => {
    if (planId) void loadById(planId);
  }, [planId, loadById]);

  const isChat = layout === "chat";

  return (
    <main className={`planner ${isChat ? "planner--chat chat-page" : "planner--page"}`}>
      <header className="planner__top">
        {/* The chat layout hides the global nav, so this is the only way home from here. */}
        <Link href="/" className="planner__home" aria-label="Back to homepage">
          🚇 <span>Home</span>
        </Link>
        <h1 className="planner__title">Helsinki</h1>
        {plan && <span className="planner__meta">{plan.title}</span>}
      </header>

      <div className="planner__grid">
        <div className="planner__chat">
          <RouteChat
            api={api}
            onPlanChange={handlePlanChange}
            onStreamingChange={setStreaming}
          />
        </div>
        <div className="planner__map">
          <PlanMapHeader plan={plan} streaming={streaming} activeDay={activeDay} />
          <DayTabs plan={plan} activeDay={activeDay} onSelect={setActiveDay} />
          <Suspense fallback={<div className="planner-map__wrap planner-map__wrap--empty">Map</div>}>
            <TravelMap plan={plan} activeDay={activeDay} />
          </Suspense>
          <RouteSteps plan={plan} activeDay={activeDay} />
        </div>
      </div>
    </main>
  );
}

export default function RoutePlannerView(props: RoutePlannerViewProps) {
  return (
    <Suspense fallback={<main className="planner" />}>
      <RoutePlannerInner {...props} />
    </Suspense>
  );
}
