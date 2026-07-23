import type { LocalRoutePlan } from "@/features/local-routes/types";
import PlanTimeline from "./visuals/PlanTimeline";

interface RouteStepsProps {
  plan: LocalRoutePlan | null;
  activeDay?: number | null;
}

export default function RouteSteps({ plan, activeDay = null }: RouteStepsProps) {
  if (!plan) {
    return (
      <div className="planner-steps planner-steps--empty">
        Timeline appears after a route is built.
      </div>
    );
  }

  return (
    <div className="planner-steps">
      <PlanTimeline plan={plan} activeDay={activeDay} />
    </div>
  );
}
