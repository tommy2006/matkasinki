const HSL_ROUTING_URL =
  "https://api.digitransit.fi/routing/v2/hsl/gtfs/v1";

function digitransitHeaders(): HeadersInit {
  const key = process.env.DIGITRANSIT_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (key) headers["digitransit-subscription-key"] = key;
  return headers;
}

export async function hslGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(HSL_ROUTING_URL, {
    method: "POST",
    headers: digitransitHeaders(),
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Digitransit routing failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("Digitransit returned no data");
  return json.data;
}

export function digitransitGeocodingHeaders(): HeadersInit {
  return digitransitHeaders();
}
