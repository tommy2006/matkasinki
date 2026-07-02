import { sendAwayEmail, triageInbox } from "@/features/out-of-office";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(triageInbox());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "send" | "triage";
    to?: string;
    message?: string;
    destination?: string;
    dates?: { start: string; end: string };
  };

  if (body.action === "triage") {
    return Response.json(triageInbox());
  }

  const trip = readState().trip;
  const result = await sendAwayEmail({
    to: body.to,
    message: body.message,
    destination: body.destination || trip?.destination,
    dates: body.dates || trip?.dates,
  });
  return Response.json({ result });
}
