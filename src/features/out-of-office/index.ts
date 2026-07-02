// Out-of-Office — real away tool: auto-reply + triage + summarise.
// Sends a default "I'm away" email via Resend when RESEND_API_KEY is set;
// otherwise returns a demo-mode preview of exactly what would be sent.

import { resend } from "@/lib/resend";

export interface AwayResult {
  sent: boolean;
  demo: boolean;
  to: string;
  from: string;
  subject: string;
  html: string;
  error?: string;
}

export async function sendAwayEmail(args: {
  to?: string;
  destination?: string;
  dates?: { start: string; end: string };
  message?: string;
}): Promise<AwayResult> {
  const to = args.to || process.env.OOO_DEFAULT_TO || "dangvuhaidang@gmail.com";
  const from = "Airport Cup <onboarding@resend.dev>";
  const where = args.destination ? ` in ${args.destination}` : "";
  const when =
    args.dates?.start && args.dates?.end ? ` from ${args.dates.start} to ${args.dates.end}` : "";
  const subject = `Out of office${where ? ` —${where.trim()}` : ""}`;
  const body =
    args.message ||
    `Hi — I'm currently away${where}${when} and offline for most of the day.\n\n` +
      `I'll triage anything urgent when I'm back. For emergencies, please mark your email URGENT and I'll get to it first.\n\n` +
      `Sent automatically by Airport Cup while its manager is out scouting. ⚽✈️`;
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.6">${body
    .split("\n")
    .map((l) => (l ? `<p>${l}</p>` : "<br/>"))
    .join("")}</div>`;

  if (!process.env.RESEND_API_KEY) {
    return { sent: false, demo: true, to, from, subject, html };
  }

  try {
    await resend.emails.send({ from, to, subject, html });
    return { sent: true, demo: false, to, from, subject, html };
  } catch (err) {
    return {
      sent: false,
      demo: false,
      to,
      from,
      subject,
      html,
      error: err instanceof Error ? err.message : "send failed",
    };
  }
}

// --- Inbox triage demo (rule-based; deterministic) --------------------------

export interface TriagedEmail {
  from: string;
  subject: string;
  bucket: "urgent" | "later" | "fyi";
  reason: string;
}

const MOCK_INBOX: { from: string; subject: string }[] = [
  { from: "billing@hosting.io", subject: "ACTION REQUIRED: invoice overdue" },
  { from: "mum", subject: "did you land ok?? call me" },
  { from: "newsletter@devweekly", subject: "This week in TypeScript" },
  { from: "boss@work.com", subject: "Re: launch — quick question before Friday" },
  { from: "linkedin", subject: "You appeared in 12 searches" },
  { from: "airline", subject: "Your return flight time has changed" },
];

export function triageInbox(): { emails: TriagedEmail[]; summary: string } {
  const emails: TriagedEmail[] = MOCK_INBOX.map((e) => {
    const s = `${e.subject} ${e.from}`.toLowerCase();
    if (/(overdue|action required|flight.*chang|urgent|asap)/.test(s))
      return { ...e, bucket: "urgent", reason: "Deadline / travel-critical" };
    if (/(boss|work|launch|call me|did you land)/.test(s))
      return { ...e, bucket: "later", reason: "Personal or work — can wait a day" };
    return { ...e, bucket: "fyi", reason: "Newsletter / notification" };
  });
  const u = emails.filter((e) => e.bucket === "urgent").length;
  const l = emails.filter((e) => e.bucket === "later").length;
  const summary = `While you were away: ${u} urgent (flight change + overdue invoice), ${l} that can wait, and the rest is noise. Handle the two urgent ones first — everything else held.`;
  return { emails, summary };
}
