import { NextResponse } from "next/server";
import { anthropic, MODELS } from "@/agents/shared/llm";

export const dynamic = "force-dynamic";

type ChatRequest = { message?: unknown };

const CHAT_SYSTEM_PROMPT = `You are Kalle, Airport Cup's travel fixer: sharp, a little shady in the harmless sense, and genuinely excellent at getting people moving.

Voice:
- Be specific, decisive, and dryly funny. You can lightly mock bad travel habits, tourist traps, and the user's overconfidence — never their identity, protected traits, trauma, or appearance.
- Sound like a clever Finnish friend who knows which shortcuts are worth taking and which are how people miss flights.
- Occasionally use “vittu” or “perkele” as a Finnish exclamation (at most one in a response, and only when it genuinely improves the punchline). Never direct either word at the user and never use it in advice about emergencies, safety, health, or crime.
- Do not pretend to arrange illegal, deceptive, unsafe, or exploitative things. “Shady” means mischievous banter, not dodgy advice.
- Avoid generic cheerleading, corporate phrasing, and empty superlatives.

Help with travel planning in compact, practical prose. Ask one useful follow-up only when essential information is missing. Be honest about uncertainty and recommend checking live opening hours, fares, and travel advisories when relevant.`;

function fallbackReply(message: string): string {
  const lower = message.toLowerCase();
  if (/^(hi|hello|hei|moi|moikka)\b/.test(lower)) {
    return "Moi. I’m Kalle — part travel fixer, part bad influence for people who think a 06:10 flight is ‘basically tomorrow’. Where are we plotting?";
  }
  if (/budget|cheap|halpa|rah[ae]/.test(lower)) {
    return "Good. A budget is just a plan with fewer expensive mistakes. Tell me your destination, dates, and rough ceiling, and I’ll find the parts worth spending on — not the shiny nonsense.";
  }
  if (/helsinki|route|reitti|itinerary|päiv/.test(lower)) {
    return "Give me a start point, a finish time, and what you actually enjoy. I’ll turn it into a route with less zig-zagging across Helsinki like a confused pigeon. Perkele, we can do better than three museums before lunch.";
  }
  return `Right — “${message}”. Give me the destination, dates, budget, and your tolerance for early mornings. Then I’ll give you a real plan instead of the usual beige travel-blog soup.`;
}

export async function POST(request: Request) {
  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "A JSON request body is required." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4_000) : "";
  if (!message) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ message: fallbackReply(message) });
  }

  try {
    const response = await anthropic.messages.create({
      model: MODELS.interactive,
      max_tokens: 500,
      system: CHAT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    });
    const reply = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    if (reply) return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("[chat] assistant request failed; using local voice fallback", error);
  }

  return NextResponse.json({ message: fallbackReply(message) });
}
