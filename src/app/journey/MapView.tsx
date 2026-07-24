"use client";

// Interactive HSL map (Leaflet) rendered from Digitransit HSL raster tiles
// (proxied via /api/tiles to keep the key server-side). Overlays the planned
// route as mode-coloured polylines (white casing under coloured lines), marks
// each chosen destination, and adds a mode legend, per-leg popups and a
// recenter control.
//
// NOTE: leaflet is imported dynamically inside useEffect so it never runs at
// SSR time. Only the stylesheet is imported at module scope.

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

const MODE_LABEL: Record<string, string> = {
  SUBWAY: "Metro",
  RAIL: "Train",
  TRAM: "Tram",
  BUS: "Bus",
  FERRY: "Ferry",
  WALK: "Walk",
};

const HELSINKI: [number, number] = [60.1699, 24.9384];

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMin(seconds: number): string {
  const m = Math.max(1, Math.round((seconds || 0) / 60));
  return `${m} min`;
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legendRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recenterRef = useRef<any>(null);

  // Keep latest props in a ref so control callbacks / listeners always see
  // current data without re-binding.
  const dataRef = useRef({ destinations, segments, bounds });
  dataRef.current = { destinations, segments, bounds };

  // init map once
  useEffect(() => {
    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

    const onWindowResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        try {
          mapRef.current?.invalidateSize();
        } catch {
          /* noop */
        }
      }, 150);
    };

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !elRef.current || mapRef.current) return;
        LRef.current = L;

        const map = L.map(elRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView(HELSINKI, 11);

        L.tileLayer("/api/tiles/{z}/{x}/{y}.png", {
          maxZoom: 18,
          minZoom: 9,
          attribution:
            'Map © <a href="https://digitransit.fi/">Digitransit</a> / HSL, © OpenStreetMap',
        }).addTo(map);

        layerRef.current = L.layerGroup().addTo(map);

        // ---- Recenter control (bottom-left) ----
        const RecenterControl = L.Control.extend({
          options: { position: "bottomleft" },
          onAdd() {
            const btn = L.DomUtil.create("button", "mv-recenter");
            btn.type = "button";
            btn.title = "Recenter route";
            btn.setAttribute("aria-label", "Recenter route");
            btn.innerHTML =
              '<span class="mv-recenter-icon">&#10021;</span><span>Recenter</span>';
            L.DomEvent.disableClickPropagation(btn);
            L.DomEvent.on(btn, "click", (e: Event) => {
              L.DomEvent.stop(e);
              recenter();
            });
            return btn;
          },
        });
        recenterRef.current = new RecenterControl();
        recenterRef.current.addTo(map);

        // ---- Legend control (bottom-right) ----
        const LegendControl = L.Control.extend({
          options: { position: "bottomright" },
          onAdd() {
            const div = L.DomUtil.create("div", "mv-legend");
            L.DomEvent.disableClickPropagation(div);
            return div;
          },
        });
        legendRef.current = new LegendControl();
        legendRef.current.addTo(map);

        mapRef.current = map;

        // Ensure tiles lay out correctly once the container has real size.
        invalidateTimer = setTimeout(() => {
          try {
            map.invalidateSize();
          } catch {
            /* noop */
          }
        }, 200);

        window.addEventListener("resize", onWindowResize);

        draw();
      } catch {
        // If leaflet fails to load, render nothing interactive but don't throw.
      }
    })();

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      if (invalidateTimer) clearTimeout(invalidateTimer);
      window.removeEventListener("resize", onWindowResize);
      try {
        mapRef.current?.remove();
      } catch {
        /* noop */
      }
      mapRef.current = null;
      layerRef.current = null;
      legendRef.current = null;
      recenterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw on data change
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, destinations, bounds]);

  function recenter() {
    const map = mapRef.current;
    if (!map) return;
    const { destinations: dests, bounds: b } = dataRef.current;
    try {
      if (b) {
        map.fitBounds(b as [[number, number], [number, number]], {
          padding: [40, 40],
          maxZoom: 15,
        });
      } else if (dests.length === 1) {
        map.setView([dests[0].lat, dests[0].lon], 14);
      } else if (dests.length) {
        map.fitBounds(dests.map((d) => [d.lat, d.lon]) as [number, number][], {
          padding: [40, 40],
          maxZoom: 14,
        });
      } else {
        map.setView(HELSINKI, 11);
      }
    } catch {
      /* noop */
    }
  }

  function updateLegend(modes: string[]) {
    const el = legendRef.current?.getContainer?.();
    if (!el) return;
    if (!modes.length) {
      el.style.display = "none";
      el.innerHTML = "";
      return;
    }
    el.style.display = "block";
    const rows = modes
      .map((m) => {
        const color = MODE_COLOR[m] ?? "#007ac9";
        const label = MODE_LABEL[m] ?? m;
        const dash =
          m === "WALK"
            ? "background:repeating-linear-gradient(90deg," +
              color +
              " 0 4px,transparent 4px 8px);"
            : "background:" + color + ";";
        return (
          '<span class="mv-legend-row">' +
          '<span class="mv-legend-swatch" style="' +
          dash +
          '"></span>' +
          '<span class="mv-legend-label">' +
          escapeHtml(label) +
          "</span></span>"
        );
      })
      .join("");
    el.innerHTML = '<div class="mv-legend-title">Route</div>' + rows;
  }

  function draw() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;

    try {
      layer.clearLayers();

      const presentModes: string[] = [];
      const seen = new Set<string>();

      // route polylines, coloured by mode, with a white casing underneath
      for (const seg of segments || []) {
        for (const leg of seg.legs || []) {
          if (!leg.path || leg.path.length < 2) continue;
          const isWalk = leg.kind === "walk";
          const color = MODE_COLOR[leg.mode] ?? "#007ac9";
          const weight = isWalk ? 4 : 6;

          if (!seen.has(leg.mode)) {
            seen.add(leg.mode);
            presentModes.push(leg.mode);
          }

          // white casing (skip for dashed walk, where it would look odd)
          if (!isWalk) {
            L.polyline(leg.path, {
              color: "#ffffff",
              weight: weight + 4,
              opacity: 0.75,
              lineCap: "round",
              lineJoin: "round",
            }).addTo(layer);
          }

          const line = L.polyline(leg.path, {
            color,
            weight,
            opacity: isWalk ? 0.85 : 0.9,
            dashArray: isWalk ? "2 8" : undefined,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(layer);

          // per-leg popup
          let popup: string;
          if (isWalk) {
            const meters =
              typeof leg.walkMeters === "number"
                ? Math.round(leg.walkMeters)
                : null;
            popup =
              '<div class="mv-pop"><b>Walk</b>' +
              (meters != null ? " " + meters + " m" : "") +
              ' <span class="mv-pop-dim">· ' +
              fmtMin(leg.seconds) +
              "</span></div>";
          } else {
            const label = MODE_LABEL[leg.mode] ?? leg.mode;
            const line2 = leg.routeShortName ? " " + leg.routeShortName : "";
            const stops =
              typeof leg.numStops === "number"
                ? " · " + leg.numStops + " stop" + (leg.numStops === 1 ? "" : "s")
                : "";
            const fromTo =
              " · " +
              escapeHtml(leg.from?.name ?? seg.fromName ?? "") +
              " → " +
              escapeHtml(leg.to?.name ?? seg.toName ?? "");
            popup =
              '<div class="mv-pop"><b>' +
              escapeHtml(label + line2) +
              "</b>" +
              escapeHtml(stops) +
              fromTo +
              ' <span class="mv-pop-dim">· ' +
              fmtMin(leg.seconds) +
              "</span></div>";
          }
          line.bindPopup(popup);
        }
      }

      // destination markers (numbered A/B/C…)
      (destinations || []).forEach((d, i) => {
        const isEnd = i === destinations.length - 1;
        const label = String.fromCharCode(65 + i);
        const html =
          '<div style="width:26px;height:26px;border-radius:50%;background:' +
          (i === 0 ? "#00985f" : isEnd ? "#ff6319" : "#111722") +
          ';color:#fff;font:700 13px/26px system-ui;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">' +
          escapeHtml(label) +
          "</div>";
        const icon = L.divIcon({
          html,
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker([d.lat, d.lon], { icon })
          .addTo(layer)
          .bindPopup(
            "<b>" +
              escapeHtml(d.name) +
              "</b>" +
              (d.code ? " · " + escapeHtml(d.code) : "") +
              (d.zone ? " · Zone " + escapeHtml(d.zone) : "")
          );
      });

      updateLegend(presentModes);

      if (bounds) {
        map.fitBounds(bounds as [[number, number], [number, number]], {
          padding: [40, 40],
          maxZoom: 15,
        });
      } else if (destinations && destinations.length === 1) {
        // A single stop has no extent to fit — centre on it instead so the
        // marker shows immediately at a sensible zoom.
        map.setView([destinations[0].lat, destinations[0].lon], 14);
      } else if (destinations && destinations.length) {
        map.fitBounds(
          destinations.map((d) => [d.lat, d.lon]) as [number, number][],
          { padding: [40, 40], maxZoom: 14 }
        );
      }
    } catch {
      // never let a draw error take down the component
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 460 }}>
      <style>{MAP_STYLES}</style>
      <div
        ref={elRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 460,
          borderRadius: "var(--radius)",
        }}
      />
    </div>
  );
}

const MAP_STYLES = `
.mv-legend {
  background: var(--bg-raised, #fff);
  color: var(--fg, #111722);
  border: 1px solid var(--line, rgba(0,0,0,.12));
  border-radius: var(--radius-sm, 8px);
  padding: 8px 10px;
  font: 500 12px/1.3 system-ui, -apple-system, sans-serif;
  box-shadow: 0 2px 10px rgba(0,0,0,.18);
  min-width: 96px;
}
.mv-legend-title {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: var(--fg-muted, #6b7280);
  margin-bottom: 6px;
}
.mv-legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.mv-legend-swatch {
  display: inline-block;
  width: 18px;
  height: 4px;
  border-radius: 2px;
  flex: none;
}
.mv-legend-label { color: var(--fg, #111722); }
.mv-recenter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-raised, #fff);
  color: var(--fg, #111722);
  border: 1px solid var(--line, rgba(0,0,0,.12));
  border-radius: var(--radius-sm, 8px);
  padding: 6px 10px;
  font: 600 12px/1 system-ui, -apple-system, sans-serif;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,.18);
}
.mv-recenter:hover { border-color: var(--fg-muted, #6b7280); }
.mv-recenter-icon { font-size: 13px; line-height: 1; }
.mv-pop {
  font: 500 12px/1.4 system-ui, -apple-system, sans-serif;
  color: var(--fg, #111722);
}
.mv-pop-dim { color: var(--fg-muted, #6b7280); }
`;
