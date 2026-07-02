"use client";

// Away-mode cockpit: (a) OOO composer -> /api/away, (b) an inbox-triage demo that
// sorts mock mail into Urgent / Can wait / FYI with a return summary, and
// (c) a Home Sitter device board with an automation log.

import { useMemo, useState } from "react";

type SendResult =
  | { status: "sent"; id?: string }
  | { status: "demo"; preview: { subject: string; body: string } }
  | { status: "error"; message: string }
  | null;

export default function AwayClient({
  destination,
  dates,
}: {
  destination: string;
  dates: { start: string; end: string } | null;
}) {
  return (
    <div className="stack">
      <div className="stack rise rise-1" style={{ gap: "var(--space-2)" }}>
        <h1>Away mode</h1>
        <p className="muted">
          Set the auto-reply, let the triage agent watch the inbox, and hand the house to the sitter
          — then actually switch off.
        </p>
      </div>
      <OooComposer destination={destination} dates={dates} />
      <InboxTriage />
      <HomeSitter />
    </div>
  );
}

/* ---------------------------------------------------------------- OOO composer */

function OooComposer({
  destination,
  dates,
}: {
  destination: string;
  dates: { start: string; end: string } | null;
}) {
  const defaultMsg = useMemo(() => {
    const where = destination ? ` in ${destination}` : " and offline";
    const back = dates?.end ? ` I'll reply after I return on ${dates.end}.` : " I'll reply when I'm back.";
    return `Thanks for your email. I'm away${where}${
      dates ? ` from ${dates.start} to ${dates.end}` : ""
    } with limited access.${back} For anything urgent, please contact my team.`;
  }, [destination, dates]);

  const [start, setStart] = useState(dates?.start ?? "");
  const [end, setEnd] = useState(dates?.end ?? "");
  const [message, setMessage] = useState(defaultMsg);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult>(null);

  async function send() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/away", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, message, destination }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setResult({ status: "error", message: data?.error ?? "Could not send the notice" });
      } else if (data?.demo || data?.status === "demo" || !data?.sent) {
        setResult({
          status: "demo",
          preview: {
            subject: data?.preview?.subject ?? `Away${destination ? ` — ${destination}` : ""}`,
            body: data?.preview?.body ?? message,
          },
        });
      } else {
        setResult({ status: "sent", id: data?.id });
      }
    } catch {
      setResult({ status: "error", message: "Network error — try again" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack rise rise-2">
      <h3 style={{ margin: 0 }}>Out-of-office auto-reply</h3>
      <div className="grid grid--2">
        <label className="stack" style={{ gap: "var(--space-1)" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>Away from</span>
          <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="stack" style={{ gap: "var(--space-1)" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>Back on</span>
          <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <label className="stack" style={{ gap: "var(--space-1)" }}>
        <span className="muted" style={{ fontSize: "0.85rem" }}>Message</span>
        <textarea
          className="input"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <div className="row">
        <button className="btn" onClick={send} disabled={loading}>
          {loading ? "Sending…" : "Send away notice"}
        </button>
        {result?.status === "sent" && (
          <span className="badge badge--accent">✓ Away notice active</span>
        )}
        {result?.status === "error" && <span className="badge badge--amber">{result.message}</span>}
      </div>

      {result?.status === "demo" && (
        <div className="card stack" style={{ background: "var(--bg-overlay)" }}>
          <div className="spread">
            <strong>Email preview</strong>
            <span className="badge badge--amber">Demo mode — add RESEND_API_KEY to send for real</span>
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Subject</span>
            <strong>{result.preview.subject}</strong>
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Body</span>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{result.preview.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- inbox triage */

type Bucket = "urgent" | "wait" | "fyi";
interface MockMail {
  from: string;
  subject: string;
  bucket: Bucket;
  reason: string;
}

const MOCK_MAIL: MockMail[] = [
  { from: "Priya (Client)", subject: "Contract signature needed today", bucket: "urgent", reason: "Deadline + decision required" },
  { from: "Ops Alerts", subject: "Prod error rate spiking", bucket: "urgent", reason: "Live incident keyword" },
  { from: "Sam (Manager)", subject: "Q3 planning — your input by Fri", bucket: "wait", reason: "Has a deadline, but after you're back" },
  { from: "Finance", subject: "Expense report reminder", bucket: "wait", reason: "Routine, non-blocking" },
  { from: "LinkedIn", subject: "5 new people viewed your profile", bucket: "fyi", reason: "Notification, no action" },
  { from: "Team Newsletter", subject: "This week at the company", bucket: "fyi", reason: "Broadcast, informational" },
];

const BUCKET_META: Record<Bucket, { label: string; cls: string; emoji: string }> = {
  urgent: { label: "Urgent", cls: "badge badge--amber", emoji: "🔥" },
  wait: { label: "Can wait", cls: "badge", emoji: "⏳" },
  fyi: { label: "FYI", cls: "badge badge--accent", emoji: "📎" },
};

function InboxTriage() {
  const counts = MOCK_MAIL.reduce(
    (a, m) => ({ ...a, [m.bucket]: (a[m.bucket] ?? 0) + 1 }),
    {} as Record<Bucket, number>
  );

  return (
    <div className="card stack rise rise-3">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Inbox triage</h3>
        <span className="badge">Agent demo · {MOCK_MAIL.length} emails sorted</span>
      </div>
      <div className="grid grid--3">
        {(Object.keys(BUCKET_META) as Bucket[]).map((b) => (
          <div key={b} className="stack" style={{ gap: "var(--space-2)" }}>
            <div className="row">
              <span className={BUCKET_META[b].cls}>
                {BUCKET_META[b].emoji} {BUCKET_META[b].label}
              </span>
              <span className="muted">{counts[b] ?? 0}</span>
            </div>
            {MOCK_MAIL.filter((m) => m.bucket === b).map((m) => (
              <div key={m.subject} className="card stack" style={{ gap: 2, background: "var(--bg-overlay)" }}>
                <strong style={{ fontSize: "0.95rem" }}>{m.subject}</strong>
                <span className="muted" style={{ fontSize: "0.85rem" }}>{m.from}</span>
                <span className="muted" style={{ fontSize: "0.8rem" }}>{m.reason}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="card" style={{ background: "var(--bg-overlay)", border: "1px solid var(--accent)" }}>
        <strong>Return summary: </strong>
        <span className="muted">
          {counts.urgent ?? 0} urgent thread(s) held for your first hour back, {counts.wait ?? 0} queued
          for the week, {counts.fyi ?? 0} archived. Nothing dropped.
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- home sitter */

interface Device {
  id: string;
  name: string;
  emoji: string;
  status: string;
  ok: boolean;
}

const DEVICES: Device[] = [
  { id: "lights", name: "Lights", emoji: "💡", status: "Presence simulation on", ok: true },
  { id: "thermostat", name: "Thermostat", emoji: "🌡️", status: "Eco 16°C · away", ok: true },
  { id: "plants", name: "Plants", emoji: "🪴", status: "Auto-water every 3 days", ok: true },
  { id: "security", name: "Security", emoji: "🔒", status: "Armed · cameras live", ok: true },
];

const AUTOMATION_LOG = [
  { time: "21:40", text: "Living-room lights on (dusk, presence sim)" },
  { time: "23:05", text: "All lights off · doors confirmed locked" },
  { time: "07:15", text: "Plants watered — soil moisture restored" },
  { time: "09:02", text: "Thermostat held at eco 16°C" },
  { time: "14:30", text: "Motion at front door → parcel photo saved" },
];

function HomeSitter() {
  return (
    <div className="card stack rise rise-4">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Home sitter</h3>
        <span className="badge badge--accent">● All systems nominal</span>
      </div>
      <div className="grid grid--2">
        {DEVICES.map((d) => (
          <div key={d.id} className="card spread" style={{ background: "var(--bg-overlay)" }}>
            <div className="row">
              <span aria-hidden style={{ fontSize: "1.4rem" }}>{d.emoji}</span>
              <div className="stack" style={{ gap: 2 }}>
                <strong>{d.name}</strong>
                <span className="muted" style={{ fontSize: "0.85rem" }}>{d.status}</span>
              </div>
            </div>
            <span className={d.ok ? "badge badge--accent" : "badge badge--amber"}>
              {d.ok ? "OK" : "Check"}
            </span>
          </div>
        ))}
      </div>
      <div className="stack" style={{ gap: "var(--space-2)" }}>
        <span className="muted" style={{ fontSize: "0.85rem" }}>Automation log</span>
        {AUTOMATION_LOG.map((l) => (
          <div key={l.time + l.text} className="row" style={{ gap: "var(--space-3)" }}>
            <span className="badge">{l.time}</span>
            <span className="muted">{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
