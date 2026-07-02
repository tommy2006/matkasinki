// /club — the club dashboard (§16). Server component: reads the store and derives
// the club directly (same pure derivation the GET /api/club route uses), then
// renders identity, squad, staff, budget, morale and the reward ledger. A client
// subcomponent handles the interactive "Play friendly" flow.

import Link from "next/link";
import { readState } from "@/lib/store";
import { deriveClub } from "@/features/club/derive";
import {
  LEAGUES,
  formatMoney,
  positionLabel,
  progressToNextTier,
} from "@/features/club";
import PlayFriendly from "./play-friendly.client";

export const dynamic = "force-dynamic";

const KIT_FALLBACK = ["#34d399", "#0b0e14"];

function Crest({ colors, name }: { colors: string[]; name: string }) {
  const [a, b] = [colors[0] ?? KIT_FALLBACK[0], colors[1] ?? KIT_FALLBACK[1]];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      aria-hidden
      style={{
        width: 84,
        height: 96,
        flexShrink: 0,
        borderRadius: "14px 14px 42px 42px / 14px 14px 60px 60px",
        background: `linear-gradient(135deg, ${a} 0%, ${a} 46%, ${b} 46%, ${b} 100%)`,
        border: "2px solid rgba(255,255,255,0.14)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.5rem",
          color: "#fff",
          textShadow: "0 2px 6px rgba(0,0,0,0.55)",
          letterSpacing: "-0.02em",
        }}
      >
        {initials || "FC"}
      </span>
    </div>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const hue = pct >= 66 ? "var(--accent)" : pct >= 40 ? "var(--accent-2)" : "var(--danger)";
  return (
    <div className="stack" style={{ gap: "var(--space-2)" }}>
      <div className="spread">
        <span className="muted" style={{ fontSize: "0.85rem" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{pct}%</span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "var(--bg-overlay)",
          border: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: hue, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

export default function ClubPage() {
  let state;
  try {
    state = readState();
  } catch {
    state = { profile: undefined, events: [] as never[] };
  }
  const profile = state.profile;
  const derived = deriveClub(state.events ?? [], profile);

  const clubName = profile?.clubName ?? "Prompt Holiday FC";
  const formation = profile?.formation ?? "4-3-3";
  const colors = profile?.colors ?? KIT_FALLBACK;
  const flavor = profile?.flavor;

  const tierName = LEAGUES[derived.leagueTier];
  const progress = progressToNextTier(derived.verifiedChallenges);
  const maxAbility = Math.max(1, ...derived.squad.map((p) => p.ability), 200);
  const empty = derived.squad.length === 0;

  return (
    <main className="page">
      <div className="container stack" style={{ gap: "var(--space-6)" }}>
        {/* Identity header */}
        <header className="card rise rise-1" style={{ padding: "var(--space-6)" }}>
          <div className="row" style={{ alignItems: "flex-start", gap: "var(--space-5)" }}>
            <Crest colors={colors} name={clubName} />
            <div className="stack" style={{ gap: "var(--space-2)", flex: 1, minWidth: 220 }}>
              <div className="row" style={{ gap: "var(--space-2)" }}>
                <span className="badge badge--amber">{tierName}</span>
                <span className="badge">Formation {formation}</span>
              </div>
              <h1 style={{ margin: 0 }}>{clubName}</h1>
              {flavor && <p className="muted" style={{ margin: 0 }}>{flavor}</p>}
              <div className="row" style={{ gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                <span
                  aria-hidden
                  style={{ width: 16, height: 16, borderRadius: 4, background: colors[0] ?? KIT_FALLBACK[0], border: "1px solid var(--line)" }}
                />
                <span
                  aria-hidden
                  style={{ width: 16, height: 16, borderRadius: 4, background: colors[1] ?? KIT_FALLBACK[1], border: "1px solid var(--line)" }}
                />
                <span className="muted" style={{ fontSize: "0.8rem" }}>club kit</span>
              </div>
            </div>
            <div className="stack" style={{ gap: "var(--space-3)", minWidth: 220 }}>
              <div className="row" style={{ gap: "var(--space-5)" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700 }}>
                    {formatMoney(derived.transferBudget)}
                  </div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>transfer budget</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700 }}>
                    {derived.squad.length}
                  </div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>players</div>
                </div>
              </div>
              <Meter value={derived.morale} label="Squad morale" />
              {progress.need > 0 ? (
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {progress.have}/{progress.need} verified challenges toward {LEAGUES[progress.nextTier!]}
                </span>
              ) : (
                <span className="badge badge--amber">Top of the ladder</span>
              )}
            </div>
          </div>
        </header>

        {/* Play friendly (client) */}
        <PlayFriendly clubName={clubName} tierName={tierName} accent={colors[0] ?? KIT_FALLBACK[0]} />

        {/* Squad */}
        <section className="stack rise rise-2">
          <div className="spread">
            <h2 style={{ margin: 0 }}>Squad</h2>
            {!empty && <span className="badge badge--accent">{derived.squad.length} scouted</span>}
          </div>

          {empty ? (
            <div className="card" style={{ textAlign: "center", padding: "var(--space-7)" }}>
              <h3>Your squad is empty</h3>
              <p className="muted">Complete verified challenges in the Local Guide to scout real players from around the world.</p>
              <Link className="btn btn--amber btn--lg" href="/guide">Open the Local Guide</Link>
            </div>
          ) : (
            <div className="grid grid--3">
              {derived.squad.map((p, i) => {
                const value = (p as { value?: number }).value;
                const potential = (p as { potential?: number }).potential;
                return (
                  <article key={`${p.id}-${i}`} className="card card--interactive">
                    <div className="spread" style={{ marginBottom: "var(--space-3)" }}>
                      <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{p.name}</h3>
                      <span className="badge badge--accent">{p.position}</span>
                    </div>
                    <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "var(--space-3)" }}>
                      {positionLabel(p.position)}
                    </div>
                    <div className="stack" style={{ gap: "var(--space-2)" }}>
                      <div className="spread">
                        <span className="muted" style={{ fontSize: "0.8rem" }}>Ability</span>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{p.ability}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "var(--bg-overlay)", border: "1px solid var(--line)", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, (p.ability / maxAbility) * 100)}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-strong), var(--accent))" }} />
                      </div>
                    </div>
                    <div className="spread" style={{ marginTop: "var(--space-3)" }}>
                      {typeof value === "number" && (
                        <span style={{ fontFamily: "var(--font-display)", color: "var(--accent-2)", fontWeight: 600 }}>
                          {formatMoney(value)}
                        </span>
                      )}
                      {typeof potential === "number" && (
                        <span className="muted" style={{ fontSize: "0.78rem" }}>PA {potential}</span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: "0.78rem", marginTop: "var(--space-3)" }}>
                      Scouted in {p.scoutedIn}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Staff */}
        {derived.staff.length > 0 && (
          <section className="stack rise rise-3">
            <h2 style={{ margin: 0 }}>Backroom staff</h2>
            <div className="grid grid--3">
              {derived.staff.map((s, i) => (
                <article key={`${s.name}-${i}`} className="card">
                  <div className="spread" style={{ marginBottom: "var(--space-2)" }}>
                    <h3 style={{ margin: 0, fontSize: "1rem" }}>{s.name}</h3>
                    <span className="badge">{s.role}</span>
                  </div>
                  <div className="muted" style={{ fontSize: "0.78rem" }}>Hired in {s.scoutedIn}</div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Event ledger */}
        <section className="stack rise rise-4">
          <div className="spread">
            <h2 style={{ margin: 0 }}>Event log</h2>
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              {derived.verifiedChallenges} verified · {derived.verifiedPlaces} grounds
            </span>
          </div>
          {derived.rewards.length === 0 ? (
            <div className="card">
              <p className="muted" style={{ margin: 0 }}>No events yet. Verified travel challenges will appear here as club rewards.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {derived.rewards.map((r, i) => {
                const good = r.verified && r.granted;
                return (
                  <div
                    key={`${r.eventKey}-${r.at}-${i}`}
                    className="spread"
                    style={{
                      padding: "var(--space-3) var(--space-5)",
                      borderTop: i === 0 ? "none" : "1px solid var(--line)",
                      borderLeft: `3px solid ${good ? "var(--accent)" : "var(--line)"}`,
                    }}
                  >
                    <div className="row" style={{ gap: "var(--space-3)" }}>
                      <span
                        aria-hidden
                        style={{ width: 9, height: 9, borderRadius: 999, background: good ? "var(--accent)" : "var(--fg-muted)", flexShrink: 0 }}
                      />
                      <span style={{ color: good ? "var(--fg)" : "var(--fg-muted)", fontSize: "0.9rem" }}>
                        {r.summary}
                      </span>
                    </div>
                    {!good && <span className="badge">no reward</span>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
