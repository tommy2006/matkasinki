import { discoverDestinations } from "@/features/discovery";
import type { DiscoveryQuery } from "@/features/discovery/types";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<DiscoveryQuery>;
  const vibe = body.vibe || readState().profile?.vibe || "explorer";
  const results = await discoverDestinations({ ...body, vibe } as DiscoveryQuery);
  return Response.json({ results });
}
