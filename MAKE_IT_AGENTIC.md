# Making Matkasinki Fully Agent-Driven — A Beginner's Step-by-Step Guide

This guide turns your teammate's advice into concrete steps, grounded in **your actual code**.
Read it top to bottom the first time. Every step says *why* it matters, not just *what* to type.

> **The one-sentence summary:** The AI agent is already built in your repo. It runs in
> **demo mode** (canned answers) until you (1) give it a funded Anthropic API key,
> (2) flip one environment flag, and (3) confirm its **tools** can reach the real APIs.
> Everything after that (a database, deploying to Vercel) is about making it *reliable and public*.

---

## 0. The mental model (read this even if you skip everything else)

**An LLM (like Claude) is a very smart intern locked in a room with no phone and no internet.**
It can read and write text brilliantly, but it can't look anything up or *do* anything in the
real world. On its own it will happily *make up* a bus route — that's the "hardcoded backup"
problem you're trying to escape.

**Tools are the phone and computer you hand the intern.** A "tool" is just a normal function
you write (e.g. "search Helsinki places", "plan an HSL route") plus a description of what it
does and what inputs it needs. You give the LLM a list of tools; it decides *when* to call them.

**An agent is the loop that lets the intern use those tools repeatedly until the job is done:**

```
You: "Plan a museum day in Helsinki."
  → Agent asks Claude what to do
  → Claude says: "call searchPlaces(museum)"     ← tool call
  → Your code runs searchPlaces, returns real museums
  → Agent feeds the result back to Claude
  → Claude says: "call planItinerary(...)"        ← another tool call
  → Your code runs it, returns a real HSL route
  → Agent feeds it back
  → Claude says: "call savePlan(...)" then writes the final answer
  → Agent shows the answer + the saved map to you
```

That loop — **ask → tool call → run tool → feed result back → repeat → final answer** — is
literally what the **`ToolLoopAgent`** class does. Your teammate is right: it has this built in;
you just configure it.

---

## 1. What you already have (a map of your repo)

You are **not** starting from zero. Here is the machinery that already exists:

| File | What it is | Status |
|---|---|---|
| `src/app/chat/` | The chat UI (built on `@assistant-ui/react`) | ✅ done |
| `src/app/api/chat/route.ts` | The web endpoint the chat talks to | ✅ done |
| `src/agents/route-planner/handler.ts` | Decides: demo answer **or** live agent? | ✅ done |
| `src/agents/route-planner/index.ts` | Creates the **`ToolLoopAgent`** (model + system prompt + tools) | ✅ done |
| `src/agents/route-planner/tools.ts` | The 4 tools: `searchPlaces`, `geocodePlace`, `planItinerary`, `savePlan` | ✅ done |
| `src/agents/route-planner/system.ts` | The agent's instructions ("you are a Helsinki route planner…") | ✅ done |
| `src/features/local-routes/` | The real work the tools call: OpenStreetMap search, Digitransit routing, geocoding | ✅ done |
| `src/lib/local-routes/store.ts` | Where saved routes are kept (in-memory / file) | ⚠️ needs a real DB for production |
| `src/features/local-routes/chat-suggestions.ts` | The **demo vs live switch** | ← this is the gate you flip |

The switch that keeps you in demo mode lives here (`chat-suggestions.ts`):

```ts
export function isDemoMode(): boolean {
  return process.env.MATKASINKI_LIVE_AGENT !== "1";        // demo unless flag = "1"
}
export function useLiveRouteAgent(): boolean {
  return !isDemoMode() && Boolean(process.env.ANTHROPIC_API_KEY);  // live needs BOTH
}
```

**Translation:** the live agent only runs when **both** are true:
1. `MATKASINKI_LIVE_AGENT=1` is set, **and**
2. `ANTHROPIC_API_KEY` is present.

Otherwise `handler.ts` returns a canned "sample" plan. That's the "reverting to hardcoded
backups" you want to stop doing.

---

## 2. Get your API keys (this is the #1 real blocker)

Tool calls need two keys. Without them the agent literally cannot work.

### 2a. Anthropic API key — **and it must have credits**

This is the brain (Claude). **Important gotcha you already hit once:** an Anthropic API key
is **separate from any Claude.ai / Claude Pro subscription**. A Pro plan does **not** give API
credits. If the account has no credits, every call fails with *"Your credit balance is too low"*
and the app silently drops back to demo answers.

1. Go to **https://console.anthropic.com** → sign in.
2. **Billing → Plans & Billing → add a payment method / buy credits** (even $5 is plenty to test).
3. **API Keys → Create Key** → copy it (starts with `sk-ant-...`). You only see it once.

### 2b. Digitransit key — you already have this

Used by the tools that plan routes and turn place names into coordinates
(`planItinerary`, `geocodePlace`). You already have `DIGITRANSIT_PRIMARY_KEY` in your `.env`.
Get one free at **https://portal-api.digitransit.fi** if you ever need a new one.

### What each key powers

| Key | Powers | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` (+credits) | The agent's thinking + deciding which tool to call | No live agent at all |
| `DIGITRANSIT_PRIMARY_KEY` | `planItinerary` (routes) + `geocodePlace` (search) + the map tiles | Route tools error; agent falls back to demo |

> 🔒 **Never** put these keys in front-end code or commit them. They live only in `.env`
> (which is git-ignored) locally, and in your host's "Environment Variables" panel in production.

---

## 3. Turn the live agent ON (locally)

1. Open your local `.env` file (in the project root — `C:\Users\dangv\Documents\prompt-holiday\.env`).
   If it doesn't exist, copy `.env.example` to `.env`.
2. Make sure it contains (fill in the real values):

   ```
   # Brain — must have credits (see step 2a)
   ANTHROPIC_API_KEY=sk-ant-...

   # THE SWITCH — turns the live agent on (default is demo)
   MATKASINKI_LIVE_AGENT=1

   # Route + geocode + map tiles (you already have these)
   DIGITRANSIT_PRIMARY_KEY=...
   DIGITRANSIT_SECONDARY_KEY=...

   # Optional: pin which Claude model the agent uses
   AI_ROUTE_MODEL=claude-sonnet-5
   ```

3. Save. Restart the dev server (env changes are only read at startup):

   ```bash
   npm run dev
   ```

4. Open **http://localhost:3000/chat** and ask: *"Plan a museum day in Helsinki starting from Kamppi."*

**How to know it's actually live (not demo):**
- The `/api/chat` `GET` response includes `demoMode` and `agentAvailable` — visit
  `http://localhost:3000/api/chat` and you should see `"demoMode": false, "agentAvailable": true`.
- Live answers vary with your wording and take a few seconds (Claude is thinking + calling tools);
  demo answers are instant and identical for the 5 preset prompts.

If it's still demo: re-check that **both** the key and the `=1` flag are set, and that you
restarted the server.

---

## 4. Make the tool calls work correctly (the core of your teammate's advice)

Your teammate said: *"define functions with correct API keys and make the agent use them
correctly."* The functions (tools) already exist — here's how to understand, verify, and improve them.

### 4a. Anatomy of a tool (from your real `tools.ts`)

```ts
import { tool } from "ai";
import { z } from "zod";

planItinerary: tool({
  // 1) DESCRIPTION — Claude reads this to decide WHEN to call the tool. Be specific.
  description:
    "Plan HSL transit + walking route through Helsinki. Pass origin, final destination, " +
    "and optional via coordinates for intermediate stops.",

  // 2) INPUT SCHEMA (zod) — the exact shape of arguments Claude must provide.
  //    Claude is forced to match this, which is how you get reliable, valid calls.
  inputSchema: z.object({
    originLat: z.number(),
    originLon: z.number(),
    destinationLat: z.number(),
    destinationLon: z.number(),
    via: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(),
  }),

  // 3) EXECUTE — the real function. THIS is where your API key is used
  //    (planItinerary() calls Digitransit under the hood).
  execute: async (input) => {
    const legs = await planItinerary({ /* ...calls the real HSL API... */ });
    return { legCount: legs.length, legs };   // whatever you return goes back to Claude
  },
}),
```

Three parts, every time: **description** (when to use it), **inputSchema** (what it needs),
**execute** (what it does). Your four tools:
- `searchPlaces` — finds museums/sights/restaurants via OpenStreetMap (no key needed).
- `geocodePlace` — turns "Senate Square" into coordinates via Digitransit.
- `planItinerary` — builds the real HSL route via Digitransit.
- `savePlan` — stores the final plan so the map page can show it.

### 4b. How the agent is wired (from your real `index.ts`)

```ts
import { ToolLoopAgent } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { HELSINKI_SYSTEM_PROMPT } from "./system";
import { routeTools } from "./tools";

export const routePlannerAgent = new ToolLoopAgent({
  model: anthropic(modelId),            // which Claude model
  instructions: HELSINKI_SYSTEM_PROMPT, // the system prompt
  tools: routeTools,                    // the toolbox above
});
```

And `handler.ts` runs it with `createAgentUIStreamResponse({ agent, uiMessages })`, which
streams the answer to the chat UI. **You don't write the loop yourself — the ToolLoopAgent does.**

### 4c. Test the tools *by themselves* before trusting the agent

A classic beginner trap is blaming the AI when the *tool* is actually broken. Test the plumbing first.
Your `planItinerary`/`geocode` are exposed through the existing HSL API routes, so with the dev
server running you can hit them directly in your browser or with `curl`:

```bash
# Does place search work? (uses Digitransit)
curl "http://localhost:3000/api/stops?q=Kamppi"

# Does route planning work end to end?
curl -X POST http://localhost:3000/api/journey ^
  -H "content-type: application/json" ^
  -d "{\"stopIds\":[\"HSL:1040413\",\"HSL:4530209\"]}"
```

If those return real data, your keys + tool functions are good, and any remaining problem is
about *prompting* the agent (section 5). If they error, fix the key/URL first.

### 4d. Configure the loop well (small tweaks that make a big difference)

- **Give the system prompt clear instructions on WHEN to use each tool** and to *finish by
  calling `savePlan`*. Vague prompts → the agent forgets to call a tool. Edit `system.ts`.
- **Cap the number of steps** so a confused agent can't loop forever and burn credits. The
  AI SDK lets you stop after N tool rounds — check the current option name on
  **https://ai-sdk.dev** (it has been `maxSteps` / `stopWhen` / `maxToolRoundtrips` in
  different versions; use whatever `ToolLoopAgent` documents today). Start with ~6.
- **Log tool calls while developing.** Add a `console.log("TOOL:", name, args)` inside each
  `execute` so you can watch, in your terminal, exactly what the agent is doing. This is the
  single best debugging habit.

---

## 5. Verify the agent *uses* the tools correctly

With logging on (4d), ask a few varied questions in `/chat` and watch your terminal:

| Symptom | Likely cause | Fix |
|---|---|---|
| Agent answers instantly, no tool logs | Still in demo mode | Re-check `MATKASINKI_LIVE_AGENT=1` + key + restart |
| Agent invents a route, never calls `planItinerary` | Weak tool description / system prompt | Make the description say *exactly* when to use it; in `system.ts` tell it "always call planItinerary for routes; never guess" |
| Tool called with wrong/missing args | Schema too loose | Tighten the `zod` schema; add `.describe("…")` to fields |
| "credit balance too low" in terminal | Anthropic account unfunded | Add credits (step 2a) |
| Tool `execute` throws 401/403 | Digitransit key missing/typo | Fix `DIGITRANSIT_PRIMARY_KEY` |
| Agent runs forever / huge bill | No step cap | Add the step limit from 4d |

**Good prompts to test:** "Plan a museum day from Kamppi", "How do I get from Pasila to the
airport if it's raining?", "A food crawl in Kallio ending near a metro station." Each should
trigger visible tool calls and a saved plan you can open on the map.

---

## 6. Give it a real database (Supabase) — why, and how

**Why you need this:** your saved routes currently live in `src/lib/local-routes/store.ts`,
which keeps them **in memory / in a local file**. That's fine on your laptop, but when you
deploy to Vercel, each request can run on a **fresh, throwaway server** — so anything saved to
memory or the local disk **disappears immediately**. To keep saved routes (and later: user
accounts, chat history), you need an external database. That's exactly what Supabase/Convex are for.

**Supabase** is the beginner-friendly choice (it's a hosted Postgres database + auto-generated
API + auth, with a generous free tier). There are tons of YouTube walkthroughs — search
"Supabase Next.js quickstart".

### 6a. One-time Supabase setup

1. Go to **https://supabase.com** → create a free project. Pick a region near Helsinki (EU).
2. In the project, open **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcd.supabase.co`)
   - **anon public key** (safe for the browser)
   - **service_role key** (server-only secret — never expose this)
3. Open the **SQL Editor** and create a table for saved routes:

   ```sql
   create table routes (
     id text primary key,
     prompt text,
     title text,
     summary text,
     data jsonb,               -- the whole plan object
     created_at timestamptz default now()
   );
   ```

4. Add the keys to your `.env` (and later to Vercel):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcd.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only secret
   ```

5. Install the client:

   ```bash
   npm install @supabase/supabase-js
   ```

### 6b. Swap the store to use Supabase

Replace the guts of `src/lib/local-routes/store.ts` so `saveRoute`/`getRoute`/`listRoutes`
read and write Supabase instead of memory. Minimal version:

```ts
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // server-side only
);

export async function saveRoute(plan: LocalRoutePlan) {
  await db.from("routes").upsert({
    id: plan.id, prompt: plan.prompt, title: plan.title,
    summary: plan.summary, data: plan,
  });
}
export async function getRoute(id: string) {
  const { data } = await db.from("routes").select("data").eq("id", id).single();
  return (data?.data as LocalRoutePlan) ?? null;
}
export async function listRoutes() {
  const { data } = await db.from("routes").select("data").order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.data as LocalRoutePlan);
}
```

> Note: these become **async** if they weren't before, so add `await` where they're called
> (the `savePlan` tool and `handler.ts`). TypeScript will point out every spot.

**Convex (the alternative your teammate uses):** Convex is a database + backend where you write
your data functions in TypeScript and it handles real-time sync. It's excellent but a slightly
bigger concept to learn. For a first project, **start with Supabase** (as your teammate also
suggested) — you can always move later.

---

## 7. Deploy it to the internet (Vercel)

Your project has **two shapes**: a **desktop app** (Electron — the "Matkasinki" shortcut) and a
**web app** (Next.js). **Vercel hosts the web app.** (Electron is only for running on your own PC;
you don't deploy that to Vercel.)

1. Your code is already on GitHub (`github.com/tommy2006/matkasinki`). Good.
2. Go to **https://vercel.com** → sign in with GitHub → **Add New… → Project** → import `matkasinki`.
3. Vercel auto-detects Next.js. Before the first deploy, open **Settings → Environment Variables**
   and add **every** key from your `.env`:
   - `ANTHROPIC_API_KEY`
   - `MATKASINKI_LIVE_AGENT` = `1`
   - `DIGITRANSIT_PRIMARY_KEY`, `DIGITRANSIT_SECONDARY_KEY`
   - `AI_ROUTE_MODEL` (optional)
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (once you've done step 6)
4. Click **Deploy**. You'll get a public URL like `https://matkasinki.vercel.app`.
5. Open `/chat` on that URL and test.

### Two deployment gotchas to know up front

- **The 7 MB `src/data/hsl-network.json`** (used by your offline `/journey` planner) is read
  from disk. That works on Vercel because it's committed to the repo and bundled — just don't
  delete it. The *live agent* path uses Digitransit directly, so it doesn't even need that file.
- **`/api/weather` writes to `weather.json`.** Writing files does **not** work on Vercel
  (the filesystem is read-only there). For production, move the "current weather" into the
  database (a one-row table) or an environment variable, or fetch a real forecast API. It's fine
  for the local/demo build as-is; just don't rely on the write in production.

---

## 8. The order to actually do this in (your checklist)

Do them in this order — each unlocks the next:

- [ ] **Step 2a:** Buy Anthropic credits + create the API key. *(Nothing works without this.)*
- [ ] **Step 3:** Put `ANTHROPIC_API_KEY` + `MATKASINKI_LIVE_AGENT=1` + Digitransit keys in `.env`, `npm run dev`.
- [ ] **Step 4c:** Confirm `/api/stops` and `/api/journey` return real data (tools work).
- [ ] **Step 5:** Test 3–4 chat prompts with tool-logging on; fix prompt/schema issues.
- [ ] **Step 4d:** Add a step cap so runaway loops can't burn credits.
- [ ] **Step 6:** Set up Supabase and swap the store (needed *before* deploying if you want saves to persist).
- [ ] **Step 7:** Import to Vercel, set env vars, deploy, test the public URL.

You can honestly stop after Step 5 and have a **fully working agentic app on your laptop** —
Steps 6–7 are about making it persistent and public.

---

## 9. Where to learn more (your teammate's links, expanded)

- **AI SDK (the `ai` package / `ToolLoopAgent` / `tool`)** — https://ai-sdk.dev → read
  "Foundations → Tools" and "Agents". This is the exact library your `route-planner` uses.
- **Anthropic tool use** — https://docs.anthropic.com → "Tool use" (the concepts behind what
  the AI SDK does for you).
- **Supabase** — https://supabase.com/docs → "Getting Started → Next.js", plus any
  "Supabase crash course" on YouTube (your teammate is right, there are many good ones).
- **Convex** (optional) — https://docs.convex.dev if you want to try the alternative later.
- **Vercel** — https://vercel.com/docs → "Deploying → Environment Variables".

---

## 10. Glossary (plain definitions)

- **LLM** — the language model (Claude). Great at text, can't act on its own.
- **Tool / function call** — a function you expose to the LLM so it can *do* things (search, route).
- **Agent** — the loop that lets the LLM call tools repeatedly until the task is done.
- **`ToolLoopAgent`** — the AI SDK class that implements that loop for you.
- **System prompt** — the standing instructions that shape how the agent behaves (`system.ts`).
- **Environment variable** — a setting/secret (like an API key) kept outside the code, in `.env` / the host panel.
- **Serverless** — hosting where each request may run on a fresh, disposable machine (why you need a DB, not local files).
- **Supabase / Convex** — hosted database + backend services so your data survives between requests.

---

*You're closer than it feels: the agent and its tools are built. Fund the key, flip the flag,
verify the tools, and you have a live agentic app. The database and Vercel are the last mile.*
