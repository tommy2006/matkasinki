"use client";

import { useEffect, useMemo, useRef } from "react";
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";
import type { LocalRoutePlan } from "@/features/local-routes/types";
import RouteMapLegend from "@/components/routes/RouteMapLegend";
import { isWalkMode, modeStyle, stopMarkerTone } from "@/components/routes/visuals/format";
import "maplibre-gl/dist/maplibre-gl.css";

interface TravelMapProps {
  plan: LocalRoutePlan | null;
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

function collectBounds(plan: LocalRoutePlan): [[number, number], [number, number]] | null {
  const coords: [number, number][] = [];
  for (const stop of plan.stops) coords.push([stop.lon, stop.lat]);
  for (const leg of plan.legs) {
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

export default function TravelMap({ plan }: TravelMapProps) {
  const mapRef = useRef<MapRef>(null);

  const lineFeatures = useMemo(() => {
    if (!plan) return [];
    return plan.legs.map((leg, i) => ({
      type: "Feature" as const,
      properties: { index: i, mode: leg.mode },
      geometry: {
        type: "LineString" as const,
        coordinates: leg.polyline.length > 1 ? leg.polyline : [],
      },
    }));
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    const bounds = collectBounds(plan);
    const map = mapRef.current?.getMap();
    if (!map || !bounds) return;

    map.fitBounds(bounds, {
      padding: { top: 64, bottom: 56, left: 48, right: 48 },
      maxZoom: 15,
      duration: 700,
    });
  }, [plan]);

  if (!plan) {
    return <div className="planner-map__wrap planner-map__wrap--empty">Map</div>;
  }

  const stopTotal = plan.stops.length;

  return (
    <div className="planner-map__wrap">
      <Map
        ref={mapRef}
        initialViewState={HELSINKI_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle={HSL_BASEMAP}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {lineFeatures.map((feature, i) => {
          if (feature.geometry.coordinates.length < 2) return null;
          const style = modeStyle(feature.properties.mode);
          const walk = isWalkMode(feature.properties.mode);

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
                  "line-color": style.color,
                  "line-width": walk ? 4 : 6,
                  "line-opacity": 1,
                  ...(style.dash ? { "line-dasharray": style.dash } : {}),
                }}
                layout={{ "line-cap": "round", "line-join": "round" }}
              />
            </Source>
          );
        })}

        {plan.stops.map((stop) => {
          const tone = stopMarkerTone(stop.order, stopTotal);
          return (
            <Marker key={stop.order} longitude={stop.lon} latitude={stop.lat} anchor="bottom">
              <div className="planner-map__pin">
                <div className={`planner-map__pin-dot planner-map__pin-dot--${tone}`}>
                  {stop.order}
                </div>
                <span className="planner-map__pin-label" title={stop.name}>
                  {stop.name}
                </span>
              </div>
            </Marker>
          );
        })}
      </Map>
      <RouteMapLegend />
    </div>
  );
}
