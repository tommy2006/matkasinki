import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ChatRequest = { message?: unknown };

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

  return NextResponse.json({
    message: `Mock response: I received “${message}”.`,
  });
}
