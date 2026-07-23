"use client";

import type { LocalRoutePlan } from "@/features/local-routes/types";
import { dayColor, dayLabel, planDays } from "./visuals/format";

interface DayTabsProps {
  plan: LocalRoutePlan | null;
  activeDay: number | null;
  onSelect: (day: number | null) => void;
}

export default function DayTabs({ plan, activeDay, onSelect }: DayTabsProps) {
  const days = plan ? planDays(plan) : [];
  // A single-day plan has nothing to switch between.
  if (days.length < 2) return null;

  return (
    <div className="planner-days" role="tablist" aria-label="Itinerary days">
      <button
        type="button"
        role="tab"
        aria-selected={activeDay === null}
        className={`planner-days__tab${activeDay === null ? " planner-days__tab--on" : ""}`}
        onClick={() => onSelect(null)}
      >
        Whole trip
      </button>
      {days.map((day) => (
        <button
          key={day.day}
          type="button"
          role="tab"
          aria-selected={activeDay === day.day}
          // The summary is a tooltip only — without an explicit label it would
          // otherwise become the tab's accessible name.
          aria-label={dayLabel(day)}
          title={day.summary}
          className={`planner-days__tab${activeDay === day.day ? " planner-days__tab--on" : ""}`}
          style={{ "--day-color": dayColor(day.day) } as React.CSSProperties}
          onClick={() => onSelect(day.day)}
        >
          <span className="planner-days__swatch" />
          {dayLabel(day)}
        </button>
      ))}
    </div>
  );
}
