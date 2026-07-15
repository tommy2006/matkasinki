import polyline from "@mapbox/polyline";

export function decodeDigitransitPolyline(
  encoded: string,
): [number, number][] {
  if (!encoded) return [];
  return polyline.decode(encoded).map(([lat, lon]) => [lon, lat] as [number, number]);
}
