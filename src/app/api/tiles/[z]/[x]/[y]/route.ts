// Proxy for Digitransit HSL raster map tiles. Keeps the subscription key
// server-side (loaded from .env) instead of exposing it to the browser.

export const dynamic = "force-dynamic";

const KEY = () => process.env.DIGITRANSIT_PRIMARY_KEY || process.env.DIGITRANSIT_SECONDARY_KEY || "";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await params;
  const yy = y.replace(/\.png$/, "");
  const key = KEY();
  const url = `https://cdn.digitransit.fi/map/v3/hsl-map/${z}/${x}/${yy}.png${key ? `?digitransit-subscription-key=${key}` : ""}`;
  try {
    const res = await fetch(url, { headers: key ? { "digitransit-subscription-key": key } : {} });
    if (!res.ok) return new Response(null, { status: res.status });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
