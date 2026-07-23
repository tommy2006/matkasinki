import { createClient } from "@supabase/supabase-js";
import type { LocalRoutePlan } from "@/features/local-routes/types";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function saveRoute(plan: LocalRoutePlan): Promise<LocalRoutePlan> {
  await db.from("routes").upsert({
    id: plan.id,
    prompt: plan.prompt,
    title: plan.title,
    summary: plan.summary ?? null,
    data: plan,
  });
  return plan;
}

export async function getRoute(id: string): Promise<LocalRoutePlan | null> {
  const { data } = await db.from("routes").select("data").eq("id", id).maybeSingle();
  return (data?.data as LocalRoutePlan) ?? null;
}

export async function listRoutes(): Promise<LocalRoutePlan[]> {
  const { data } = await db.from("routes").select("data").order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.data as LocalRoutePlan);
}

export function newRouteId(): string {
  return `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}