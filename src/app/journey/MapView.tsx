"use client";

// Interactive HSL map (Leaflet) rendered from Digitransit HSL raster tiles
// (proxied via /api/tiles to keep the key server-side). Overlays the planned
// route as mode-coloured polylines and marks each chosen destination.

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { JourneySegment, StopLite } from "@/lib/hsl/types";

const MODE_COLOR: Record<string, string> = {
  SUBWAY: "#ff6319",
  RAIL: "#8c4799",
  TRAM: "#00985f",
  BUS: "#007ac9",
  FERRY: "#00b9e4",
  WALK: "#8a94a6",
};

const HELSINKI: [number, number] = [60.1699, 24.9384];

export default function MapView({
  destinations,
  segments,
  bounds,
}: {
  destinations: StopLite[];
  segments: JourneySegment[];
  bounds?: [[number, number], [number, number]];
}) {
  const elRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);

  // init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView(HELSINKI, 11);
      L.tileLayer("/api/tiles/{z}/{x}/{y}.png", {
        maxZoom: 18,
        minZoom: 9,
        attribution: 'Map © <a href="https://digitransit.fi/">Digitransit</a> / HSL, © OpenStreetMap',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      draw();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw on data change
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, destinations, bounds]);

  function draw() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

    // route polylines, coloured by mode
    for (const seg of segments) {
      for (const leg of seg.legs) {
        if (!leg.path || leg.path.length < 2) continue;
        const color = MODE_COLOR[leg.mode] ?? "#007ac9";
        L.polyline(leg.path, {
          color,
          weight: leg.kind === "walk" ? 4 : 6,
          opacity: 0.9,
          dashArray: leg.kind === "walk" ? "2 8" : undefined,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layer);
      }
    }

    // destination markers (numbered)
    destinations.forEach((d, i) => {
      const isEnd = i === destinations.length - 1;
      const label = String.fromCharCode(65 + i); // A, B, C…
      const html = `<div style="width:26px;height:26px;border-radius:50%;background:${
        i === 0 ? "#00985f" : isEnd ? "#ff6319" : "#111722"
      };color:#fff;font:700 13px/26px system-ui;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${label}</div>`;
      const icon = L.divIcon({ html, className: "", iconSize: [26, 26], iconAnchor: [13, 13] });
      L.marker([d.lat, d.lon], { icon })
        .addTo(layer)
        .bindPopup(`<b>${d.name}</b>${d.zone ? ` · Zone ${d.zone}` : ""}`);
    });

    if (bounds) {
      map.fitBounds(bounds as [[number, number], [number, number]], { padding: [40, 40], maxZoom: 15 });
    } else if (destinations.length) {
      map.fitBounds(destinations.map((d) => [d.lat, d.lon]) as [number, number][], { padding: [40, 40], maxZoom: 14 });
    }
  }

  return <div ref={elRef} style={{ width: "100%", height: "100%", minHeight: 460, borderRadius: "var(--radius)" }} />;
}
