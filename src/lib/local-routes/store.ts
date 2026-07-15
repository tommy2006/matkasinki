import fs from "node:fs";
import path from "node:path";
import type { LocalRoutePlan } from "@/features/local-routes/types";
import { LocalRoutePlanSchema } from "@/features/local-routes/types";

const ROUTES_DIR = path.join(process.cwd(), ".data/routes");
const cache = new Map<string, LocalRoutePlan>();
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (!fs.existsSync(ROUTES_DIR)) return;
    for (const file of fs.readdirSync(ROUTES_DIR)) {
      if (!file.endsWith(".json")) continue;
      const raw = JSON.parse(fs.readFileSync(path.join(ROUTES_DIR, file), "utf8"));
      const parsed = LocalRoutePlanSchema.safeParse(raw);
      if (parsed.success) cache.set(parsed.data.id, parsed.data);
    }
  } catch {
    /* empty store */
  }
}

export function saveRoute(plan: LocalRoutePlan): LocalRoutePlan {
  ensureLoaded();
  cache.set(plan.id, plan);
  fs.mkdirSync(ROUTES_DIR, { recursive: true });
  fs.writeFileSync(path.join(ROUTES_DIR, `${plan.id}.json`), JSON.stringify(plan, null, 2));
  return plan;
}

export function getRoute(id: string): LocalRoutePlan | null {
  ensureLoaded();
  return cache.get(id) ?? null;
}

export function listRoutes(): LocalRoutePlan[] {
  ensureLoaded();
  return [...cache.values()].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

export function newRouteId(): string {
  return `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
