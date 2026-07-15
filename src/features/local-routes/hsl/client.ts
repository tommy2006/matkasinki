export {
  digitransitHeaders,
  digitransitKey,
  hslGraphql,
  HSL_ROUTING_URL,
} from "@/lib/hsl/digitransit";

import { digitransitHeaders } from "@/lib/hsl/digitransit";

export function digitransitGeocodingHeaders(): HeadersInit {
  return digitransitHeaders();
}
