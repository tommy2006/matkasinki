import { ROUTE_LEGEND, type ModeStyle } from "./visuals/format";

interface RouteMapLegendProps {
  /** Defaults to the transit-mode legend; pass day swatches for a whole-trip view. */
  items?: ModeStyle[];
}

export default function RouteMapLegend({ items = ROUTE_LEGEND }: RouteMapLegendProps) {
  return (
    <div className="planner-map__legend" aria-label="Route legend">
      {items.map((item) => (
        <span key={item.label} className="planner-map__legend-item">
          <span
            className={`planner-map__legend-line${item.dash ? " planner-map__legend-line--dash" : ""}`}
            style={{ background: item.dash ? undefined : item.color, borderColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
