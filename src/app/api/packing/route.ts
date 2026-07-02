import { generatePackingList } from "@/features/packing-list";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    destination?: string;
    dates?: { start: string; end: string };
    tripType?: string;
  };
  const trip = readState().trip;
  const list = await generatePackingList({
    destination: body.destination || trip?.destination || "Porto, Portugal",
    dates: body.dates || trip?.dates || {
      start: new Date().toISOString().slice(0, 10),
      end: new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10),
    },
    tripType: body.tripType,
  });
  return Response.json({ list });
}
