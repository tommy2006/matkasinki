"use client";

import { useMemo } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";
import type { LocalRoutePlan } from "@/features/local-routes/types";
import "maplibre-gl/dist/maplibre-gl.css";

interface TravelMapProps {
  plan: LocalRoutePlan | null;
}

const HELSINKI_CENTER = { longitude: 24.9384, latitude: 60.1699, zoom: 12 };

export default function TravelMap({ plan }: TravelMapProps) {
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

  const bounds = useMemo(() => {
    if (!plan?.stops.length) return null;
    const lons = plan.stops.map((s) => s.lon);
    const lats = plan.stops.map((s) => s.lat);
    return {
      minLon: Math.min(...lons) - 0.02,
      maxLon: Math.max(...lons) + 0.02,
      minLat: Math.min(...lats) - 0.02,
      maxLat: Math.max(...lats) + 0.02,
    };
  }, [plan]);

  const initialView = bounds
    ? {
        longitude: (bounds.minLon + bounds.maxLon) / 2,
        latitude: (bounds.minLat + bounds.maxLat) / 2,
        zoom: 13,
      }
    : HELSINKI_CENTER;

  return (
    <div className="routes-map-wrap">
      <Map
        initialViewState={initialView}
        style={{ width: "100%", height: "100%" }}
        mapStyle={{
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        }}
      >
        {lineFeatures.map((feature, i) =>
          feature.geometry.coordinates.length > 1 ? (
            <Source key={`leg-${i}`} type="geojson" data={feature}>
              <Layer
                id={`leg-line-${i}`}
                type="line"
                paint={{
                  "line-color":
                    feature.properties.mode === "WALK" ? "#9aa7bd" : "#34d399",
                  "line-width": feature.properties.mode === "WALK" ? 3 : 4,
                  "line-opacity": 0.85,
                }}
                layout={{ "line-cap": "round", "line-join": "round" }}
              />
            </Source>
          ) : null,
        )}

        {plan?.stops.map((stop) => (
          <Marker key={stop.order} longitude={stop.lon} latitude={stop.lat} anchor="bottom">
            <div className="routes-marker" title={stop.name}>
              {stop.order}
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
