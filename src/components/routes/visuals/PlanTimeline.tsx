import type { CSSProperties } from "react";
import type { LocalRoutePlan, RouteLeg, RouteStop } from "@/features/local-routes/types";
import {
  dayColor,
  dayLabel,
  formatDuration,
  legsForDay,
  modeStyle,
  modeTag,
  planDays,
  statsLine,
  stopsForDay,
} from "./format";

interface PlanTimelineProps {
  plan: LocalRoutePlan;
  /** Day to show, or null for the whole trip. */
  activeDay?: number | null;
}

function StopList({ stops, legs }: { stops: RouteStop[]; legs: RouteLeg[] }) {
  return (
    <ol className="timeline">
      {stops.map((stop, i) => {
        const leg = legs[i];
        const legStyle = leg ? modeStyle(leg.mode) : null;

        return (
          <li key={`${stop.day}-${stop.order}`} className="timeline__group">
            <div className="timeline__stop">
              <span
                className={`timeline__stop-mark timeline__stop-mark--${
                  stop.order === 1 ? "start" : stop.order === stops.length ? "end" : "mid"
                }`}
              >
                {stop.order}
              </span>
              <div className="timeline__stop-body">
                <span className="timeline__stop-name">{stop.name}</span>
                {stop.why && <span className="timeline__stop-why">{stop.why}</span>}
                {(stop.timeLabel || (stop.dwellMinutes != null && stop.dwellMinutes > 0)) && (
                  <span className="timeline__stop-meta">
                    {[
                      stop.timeLabel,
                      stop.dwellMinutes ? `${stop.dwellMinutes} min here` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>
            </div>

            {leg && legStyle && (
              <div
                className="timeline__leg"
                style={{ "--leg-color": legStyle.color } as CSSProperties}
              >
                <span className="timeline__leg-mode">{modeTag(leg.mode, leg.line)}</span>
                <div className="timeline__leg-body">
                  <span className="timeline__leg-instruction">{leg.instruction}</span>
                  <span className="timeline__leg-meta">
                    {formatDuration(leg.durationSeconds)}
                    {leg.line && leg.mode.toUpperCase() !== "WALK" ? ` · line ${leg.line}` : ""}
                    {leg.fromName && leg.toName ? ` · ${leg.fromName} → ${leg.toName}` : ""}
                  </span>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function PlanTimeline({ plan, activeDay = null }: PlanTimelineProps) {
  const days = planDays(plan);
  const shown = activeDay == null ? days : days.filter((d) => d.day === activeDay);

  // Single-day itinerary: no point wrapping one list in a day header.
  if (days.length < 2) {
    return <StopList stops={plan.stops} legs={plan.legs} />;
  }

  return (
    <div className="timeline-days">
      {shown.map((day) => {
        const stops = stopsForDay(plan, day.day);
        const legs = legsForDay(plan, day.day);

        return (
          <section key={day.day} className="timeline-day">
            <header
              className="timeline-day__head"
              style={{ "--day-color": dayColor(day.day) } as CSSProperties}
            >
              <h3 className="timeline-day__title">{dayLabel(day)}</h3>
              <span className="timeline-day__stats">{statsLine(stops, legs)}</span>
            </header>
            {day.summary && <p className="timeline-day__summary">{day.summary}</p>}
            <StopList stops={stops} legs={legs} />
          </section>
        );
      })}
    </div>
  );
}
