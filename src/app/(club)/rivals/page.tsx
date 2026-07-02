// /rivals (§15) — four AI rival managers built from real DB clubs, plus a
// leaderboard mixing the user with the rivals. Server component derives the
// user's own standing; a client panel handles the "invite a friend" flow.

import { readState } from "@/lib/store";
import { deriveClub, squadStrength } from "@/features/club/derive";
import { LEAGUES, tierForVerifiedCount } from "@/features/club";
import { getRivals, type Rival } from "@/features/club/rivals";
import InvitePanel from "./invite-panel.client";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  club: string;
  strength: number;
  verified: number;
  tier: number;
  isUser: boolean;
}

export default function RivalsPage() {
  let state;
  try {
    state = readState();
  } catch {
    state = { profile: undefined, events: [] as never[] };
  }
  const derived = deriveClub(state.events ?? [], state.profile);
  const userClub = state.profile?.clubName ?? "Prompt Holiday FC";
  const userStrength = squadStrength(derived);
  const userVerified = derived.verifiedChallenges;

  let rivals: Rival[] = [];
  try {
    rivals = getRivals(new Date());
  } catch {
    rivals = [];
  }

  const rows: Row[] = [
    {
      id: "you",
      name: "You",
      club: userClub,
      strength: userStrength,
      verified: userVerified,
      tier: tierForVerifiedCount(userVerified),
      isUser: true,
    },
    ...rivals.map((r) => ({
      id: r.id,
      name: r.managerName,
      club: r.clubName,
      strength: r.squadStrength,
      verified: r.verifiedChallenges,
      tier: r.tier,
      isUser: false,
    })),
  ].sort((a, b) => b.strength - a.strength || b.verified - a.verified);

  return (
    <main className="page">
      <div className="container stack" style={{ gap: "var(--space-6)" }}>
        <header className="stack rise rise-1" style={{ gap: "var(--space-2)" }}>
          <span className="badge badge--amber">The Circuit</span>
          <h1 style={{ margin: 0 }}>Rival managers</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 620 }}>
            Four AI managers roam the globe scouting talent. They evolve every day — climb the
            ladder to overtake them on the leaderboard.
          </p>
        </header>

        {/* persona cards */}
        <section className="grid grid--2 rise rise-2">
          {rivals.map((r) => (
            <article key={r.id} className="card card--interactive">
              <div className="spread" style={{ marginBottom: "var(--space-3)" }}>
                <div className="stack" style={{ gap: 2 }}>
                  <h3 style={{ margin: 0 }}>{r.managerName}</h3>
                  <span className="muted" style={{ fontSize: "0.82rem" }}>{r.nationality}</span>
                </div>
                <span className="badge badge--accent">{LEAGUES[r.tier]}</span>
              </div>
              <p className="muted" style={{ fontSize: "0.88rem", fontStyle: "italic", margin: "0 0 var(--space-4)" }}>
                “{r.persona}”
              </p>
              <div className="stack" style={{ gap: "var(--space-2)" }}>
                <div className="spread">
                  <span className="muted" style={{ fontSize: "0.82rem" }}>Club</span>
                  <span style={{ fontWeight: 600 }}>{r.clubName}</span>
                </div>
                <div className="spread">
                  <span className="muted" style={{ fontSize: "0.82rem" }}>Origin</span>
                  <span style={{ fontSize: "0.85rem" }}>{r.clubOrigin}</span>
                </div>
                <div className="spread">
                  <span className="muted" style={{ fontSize: "0.82rem" }}>Scouting in</span>
                  <span className="badge badge--amber">📍 {r.scoutingIn}</span>
                </div>
                <div className="spread" style={{ marginTop: "var(--space-2)" }}>
                  <span className="muted" style={{ fontSize: "0.82rem" }}>Squad strength</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--accent)" }}>
                    {r.squadStrength}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "var(--bg-overlay)", border: "1px solid var(--line)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (r.squadStrength / 200) * 100)}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-strong), var(--accent))" }} />
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* leaderboard */}
        <section className="stack rise rise-3">
          <h2 style={{ margin: 0 }}>Leaderboard</h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              className="row"
              style={{
                gap: 0,
                padding: "var(--space-3) var(--space-5)",
                borderBottom: "1px solid var(--line)",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--fg-muted)",
                flexWrap: "nowrap",
              }}
            >
              <span style={{ width: 40 }}>#</span>
              <span style={{ flex: 1 }}>Manager</span>
              <span style={{ width: 130, textAlign: "right" }}>Tier</span>
              <span style={{ width: 90, textAlign: "right" }}>Verified</span>
              <span style={{ width: 90, textAlign: "right" }}>Strength</span>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.id}
                className="row"
                style={{
                  gap: 0,
                  padding: "var(--space-3) var(--space-5)",
                  borderTop: i === 0 ? "none" : "1px solid var(--line)",
                  background: row.isUser ? "rgba(52,211,153,0.08)" : "transparent",
                  borderLeft: row.isUser ? "3px solid var(--accent)" : "3px solid transparent",
                  flexWrap: "nowrap",
                }}
              >
                <span style={{ width: 40, fontFamily: "var(--font-display)", fontWeight: 700, color: i === 0 ? "var(--accent-2)" : "var(--fg-muted)" }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: row.isUser ? 700 : 500, color: row.isUser ? "var(--accent)" : "var(--fg)" }}>
                    {row.name}
                  </span>
                  <span className="muted" style={{ fontSize: "0.8rem", display: "block" }}>{row.club}</span>
                </span>
                <span style={{ width: 130, textAlign: "right", fontSize: "0.82rem", color: "var(--fg-muted)" }}>
                  {LEAGUES[row.tier]}
                </span>
                <span style={{ width: 90, textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 600 }}>
                  {row.verified}
                </span>
                <span style={{ width: 90, textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)" }}>
                  {row.strength}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* invite a friend */}
        <section className="rise rise-4">
          <InvitePanel />
        </section>
      </div>
    </main>
  );
}
