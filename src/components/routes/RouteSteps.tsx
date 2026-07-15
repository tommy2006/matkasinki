import type { LocalRoutePlan } from "@/features/local-routes/types";

interface RouteStepsProps {
  plan: LocalRoutePlan | null;
}

function formatDuration(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  return `${m} min`;
}

export default function RouteSteps({ plan }: RouteStepsProps) {
  if (!plan) {
    return (
      <div className="card routes-steps routes-steps--empty">
        <p className="muted" style={{ margin: 0 }}>
          Your route steps will appear here after the agent builds a plan.
        </p>
      </div>
    );
  }

  return (
    <div className="card routes-steps stack" style={{ gap: "var(--space-4)" }}>
      <div className="stack" style={{ gap: "var(--space-2)" }}>
        <span className="badge badge--accent">{plan.demo ? "Demo route" : "Saved route"}</span>
        <h3 style={{ margin: 0 }}>{plan.title}</h3>
        {plan.summary && <p className="muted" style={{ margin: 0 }}>{plan.summary}</p>}
      </div>

      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <h4 style={{ margin: 0, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Stops
        </h4>
        <ol className="routes-stops">
          {plan.stops.map((s) => (
            <li key={s.order}>
              <strong>{s.name}</strong>
              {s.category && <span className="muted"> · {s.category}</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <h4 style={{ margin: 0, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Legs
        </h4>
        <ul className="routes-legs">
          {plan.legs.map((leg, i) => (
            <li key={i} className="routes-leg">
              <span className="routes-leg__mode">{leg.mode}</span>
              <div className="routes-leg__body">
                <span>{leg.instruction}</span>
                <span className="muted routes-leg__meta">{formatDuration(leg.durationSeconds)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
