import type { LocalRoutePlan } from "@/features/local-routes/types";
import { legsForDay, planDays, statsLine, stopsForDay } from "./visuals/format";

interface PlanMapHeaderProps {
  plan: LocalRoutePlan | null;
  streaming?: boolean;
  activeDay?: number | null;
}

export default function PlanMapHeader({ plan, streaming, activeDay = null }: PlanMapHeaderProps) {
  if (!plan && !streaming) {
    return (
      <div className="planner-map__head">
        <span>Route</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="planner-map__head">
        <span>Planning…</span>
      </div>
    );
  }

  const dayCount = planDays(plan).length;
  const scope = activeDay == null ? null : `Day ${activeDay}`;
  const stats = statsLine(stopsForDay(plan, activeDay), legsForDay(plan, activeDay));

  return (
    <div className="planner-map__head">
      <strong className="planner-map__title">{plan.title}</strong>
      <span>
        {scope ?? (dayCount > 1 ? `${dayCount} days` : null)}
        {scope || dayCount > 1 ? " · " : ""}
        {stats}
      </span>
    </div>
  );
}
