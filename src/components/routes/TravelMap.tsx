"use client";

import { useEffect, useMemo, useRef } from "react";
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";
import type { LocalRoutePlan, RouteLeg, RouteStop } from "@/features/local-routes/types";
import RouteMapLegend from "@/components/routes/RouteMapLegend";
import {
  dayColor,
  dayOf,
  isWalkMode,
  legsForDay,
  modeStyle,
  modeTag,
  planDays,
  stopMarkerTone,
  stopsForDay,
  type ModeStyle,
} from "@/components/routes/visuals/format";
import "maplibre-gl/dist/maplibre-gl.css";

interface TravelMapProps {
  plan: LocalRoutePlan | null;
  /** Day to show, or null for the whole trip. */
  activeDay?: number | null;
}

const HELSINKI_CENTER = { longitude: 24.9384, latitude: 60.1699, zoom: 12 };

const HSL_BASEMAP = {
  version: 8 as const,
  sources: {
    hsl: {
      type: "raster" as const,
      tiles: ["/api/tiles/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© Digitransit / HSL, © OpenStreetMap",
    },
  },
  layers: [{ id: "hsl", type: "raster" as const, source: "hsl" }],
};

function collectBounds(
  stops: RouteStop[],
  legs: RouteLeg[],
): [[number, number], [number, number]] | null {
  const coords: [number, number][] = [];
  for (const stop of stops) coords.push([stop.lon, stop.lat]);
  for (const leg of legs) {
    for (const point of leg.polyline) coords.push(point);
  }
  if (coords.length === 0) return null;

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

/** Point roughly halfway along a polyline — where the route badge sits. */
function midpoint(polyline: [number, number][]): [number, number] | null {
  if (polyline.length === 0) return null;
  return polyline[Math.floor(polyline.length / 2)];
}

export default function TravelMap({ plan, activeDay = null }: TravelMapProps) {
  const mapRef = useRef<MapRef>(null);

  const days = useMemo(() => (plan ? planDays(plan) : []), [plan]);
  const multiDay = days.length > 1;
  // Across a whole multi-day trip the lines are coloured by day so the days
  // stay separable; inside one day they go back to carrying transit mode.
  const colorByDay = multiDay && activeDay == null;

  const stops = useMemo(() => (plan ? stopsForDay(plan, activeDay) : []), [plan, activeDay]);
  const legs = useMemo(() => (plan ? legsForDay(plan, activeDay) : []), [plan, activeDay]);

  useEffect(() => {
    const bounds = collectBounds(stops, legs);
    const map = mapRef.current?.getMap();
    if (!map || !bounds) return;

    map.fitBounds(bounds, {
      padding: { top: 64, bottom: 56, left: 48, right: 48 },
      maxZoom: 15,
      duration: 700,
    });
  }, [stops, legs]);

  const legend: ModeStyle[] | undefined = colorByDay
    ? days.map((d) => ({ color: dayColor(d.day), label: `Day ${d.day}` }))
    : undefined;

  if (!plan) {
    return <div className="planner-map__wrap planner-map__wrap--empty">Map</div>;
  }

  const stopTotal = stops.length;

  return (
    <div className="planner-map__wrap">
      <Map
        ref={mapRef}
        initialViewState={HELSINKI_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle={HSL_BASEMAP}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {legs.map((leg, i) => {
          if (leg.polyline.length < 2) return null;
          const walk = isWalkMode(leg.mode);
          const color = colorByDay ? dayColor(dayOf(leg)) : modeStyle(leg.mode).color;
          const dash = walk ? ([2, 2] as [number, number]) : undefined;
          const feature = {
            type: "Feature" as const,
            properties: {},
            geometry: { type: "LineString" as const, coordinates: leg.polyline },
          };

          return (
            <Source key={`leg-${i}`} id={`leg-${i}`} type="geojson" data={feature}>
              <Layer
                id={`leg-casing-${i}`}
                type="line"
                paint={{
                  "line-color": "#0b0e14",
                  "line-width": walk ? 7 : 10,
                  "line-opacity": 0.9,
                }}
                layout={{ "line-cap": "round", "line-join": "round" }}
              />
              <Layer
                id={`leg-line-${i}`}
                type="line"
                paint={{
                  "line-color": color,
                  "line-width": walk ? 4 : 6,
                  "line-opacity": 1,
                  ...(dash ? { "line-dasharray": dash } : {}),
                }}
                layout={{ "line-cap": "round", "line-join": "round" }}
              />
            </Source>
          );
        })}

        {/* Route labels: which line you actually board, pinned to the leg it belongs to. */}
        {legs.map((leg, i) => {
          if (isWalkMode(leg.mode) || leg.polyline.length < 2) return null;
          const at = midpoint(leg.polyline);
          if (!at) return null;
          const color = colorByDay ? dayColor(dayOf(leg)) : modeStyle(leg.mode).color;

          return (
            <Marker key={`leg-label-${i}`} longitude={at[0]} latitude={at[1]} anchor="center">
              <span
                className="planner-map__leg-badge"
                style={{ borderColor: color, color }}
                title={leg.instruction}
              >
                {modeTag(leg.mode, leg.line)}
              </span>
            </Marker>
          );
        })}

        {stops.map((stop) => {
          const day = dayOf(stop);
          const tone = stopMarkerTone(stop.order, stopTotal);
          const showDay = multiDay && activeDay == null;

          return (
            <Marker
              key={`${day}-${stop.order}`}
              longitude={stop.lon}
              latitude={stop.lat}
              anchor="bottom"
            >
              <div className="planner-map__pin">
                <div
                  className={`planner-map__pin-dot planner-map__pin-dot--${tone}`}
                  style={showDay ? { background: dayColor(day), color: "#0b0e14" } : undefined}
                >
                  {stop.order}
                </div>
                <span className="planner-map__pin-label" title={stop.why ?? stop.name}>
                  <span className="planner-map__pin-name">
                    {showDay && <b className="planner-map__pin-day">D{day}</b>}
                    {stop.name}
                  </span>
                  {stop.timeLabel && (
                    <span className="planner-map__pin-time">{stop.timeLabel}</span>
                  )}
                </span>
              </div>
            </Marker>
          );
        })}
      </Map>
      <RouteMapLegend items={legend} />
    </div>
  );
}
