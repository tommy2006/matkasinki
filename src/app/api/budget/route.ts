import { logExpense, getBudgetSummary } from "@/features/budget-tracker";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const home = new URL(req.url).searchParams.get("home") || "USD";
  return Response.json({ summary: await getBudgetSummary(home) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    amount?: number;
    currency?: string;
    category?: string;
    note?: string;
    home?: string;
  };
  if (body.amount != null) {
    await logExpense({
      amount: Number(body.amount),
      currency: body.currency || "USD",
      category: body.category || "other",
      note: body.note,
    });
  }
  return Response.json({ summary: await getBudgetSummary(body.home || "USD") });
}
