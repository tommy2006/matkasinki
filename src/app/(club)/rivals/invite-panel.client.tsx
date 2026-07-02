"use client";

// "Invite a friend" panel. Multiplayer accounts are future work (§15), so this
// produces a MOCK invite link. It mirrors inviteFriend() from the rivals module
// exactly (same FNV-1a code) — that function is server-only (fs imports), so we
// reproduce its deterministic, client-safe hash here rather than importing it.

import { useState } from "react";

/** FNV-1a 32-bit — identical to hashString in @/features/club. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

interface MockInvite {
  email: string;
  code: string;
  url: string;
  note: string;
}

function makeInvite(email: string): MockInvite {
  const code = hashString(`${email.toLowerCase()}::prompt-holiday`).toString(36).slice(0, 8);
  return {
    email,
    code,
    url: `/rivals?invite=${code}`,
    note: "Multiplayer accounts are future work — this link is a preview stub.",
  };
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function InvitePanel() {
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState<MockInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setCopied(false);
    setInvite(makeInvite(email.trim()));
  }

  async function copy(url: string) {
    try {
      const full = typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url;
      await navigator.clipboard.writeText(full);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <h2 style={{ margin: 0 }}>Invite a friend</h2>
        <span className="badge">accounts coming soon</span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Head-to-head against real friends is on the roadmap. Generate a preview invite link now.
      </p>

      <form onSubmit={submit} className="row" style={{ gap: "var(--space-2)", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            className="input"
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            aria-label="Friend's email"
          />
          {error && (
            <div style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "var(--space-1)" }}>{error}</div>
          )}
        </div>
        <button className="btn btn--amber" type="submit">Create invite</button>
      </form>

      {invite && (
        <div
          className="card"
          style={{ marginTop: "var(--space-4)", background: "var(--bg-overlay)" }}
        >
          <div className="spread" style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
            <div className="stack" style={{ gap: 2, minWidth: 0 }}>
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                Invite for {invite.email} · code {invite.code}
              </span>
              <code
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.85rem",
                  color: "var(--accent)",
                  wordBreak: "break-all",
                }}
              >
                {invite.url}
              </code>
            </div>
            <button className="btn btn--ghost" type="button" onClick={() => copy(invite.url)}>
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem", margin: "var(--space-3) 0 0" }}>
            {invite.note}
          </p>
        </div>
      )}
    </div>
  );
}
