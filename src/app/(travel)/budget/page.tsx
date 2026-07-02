// /budget — server component computes the initial budget summary in the home
// currency, then hands off to the client for logging expenses.

import { getBudgetSummary, CATEGORIES, type BudgetSummary } from "@/features/budget-tracker";
import { CURRENCIES } from "@/lib/currency";
import BudgetClient from "./budget.client";

export const dynamic = "force-dynamic";

const HOME = "USD";

export default async function BudgetPage() {
  let summary: BudgetSummary | null = null;
  try {
    summary = await getBudgetSummary(HOME);
  } catch {
    summary = null;
  }

  return (
    <main className="page">
      <div className="container">
        <BudgetClient
          home={HOME}
          initial={summary}
          currencies={CURRENCIES}
          categories={[...CATEGORIES]}
        />
      </div>
    </main>
  );
}
