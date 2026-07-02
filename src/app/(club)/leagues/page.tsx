// /leagues — the cup ladder (§14). The app is NAMED after this: five tiers from
// Check-In Cup up to the Airport Champions League. Server component derives the
// user's current tier and progress, and pulls real club names from increasing-
// reputation DB leagues as "featured clubs" flavor per tier.

import Link from "next/link";
import { readState } from "@/lib/store";
import { deriveClub } from "@/features/club/derive";
import { LEAGUES, TIER_THRESHOLDS, progressToNextTier } from "@/features/club";
import {
  getClubs,
  getLeagues,
  getPlayableCountryCodes,
  isDbAvailable,
  type DbLeague,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const TIER_META = [
  { tagline: "Where every squad starts. Board the ladder.", glow: "var(--fg-muted)" },
  { tagline: "Out of the queue, into the lounge. Momentum builds.", glow: "var(--fg-muted)" },
  { tagline: "The concourse is buzzing — real contenders now.", glow: "var(--accent)" },
  { tagline: "The marquee. Floodlights, silverware, everything on the line.", glow: "var(--accent-2)" },
  { tagline: "The summit of world travel-football. Legends only.", glow: "var(--accent-2)" },
];

/**
 * Featured clubs per tier: sweep playable countries, rank leagues by reputation,
 * and hand the higher tiers the more prestigious leagues so grandeur increases
 * with the ladder. Deterministic, read-only.
 */
function featuredByTier(): string[][] {
  const out: string[][] = [[], [], [], [], []];
  if (!isDbAvailable()) return out;

  const leagues: DbLeague[] = [];
  for (const cc of getPlayableCountryCodes()) {
    for (const l of getLeagues(cc)) leagues.push(l);
  }
  // Low reputation -> low tiers, high reputation -> the marquee tiers.
  leagues.sort((a, b) => a.reputation - b.reputation);
  if (leagues.length === 0) return out;

  const per = Math.max(1, Math.floor(leagues.length / 5));
  for (let tier = 0; tier < 5; tier++) {
    // Sample from the reputation band that maps to this tier.
    const start = tier * per;
    const band = leagues.slice(start, tier === 4 ? undefined : start + per);
    const seen = new Set<string>();
    for (const l of band) {
      if (out[tier].length >= 3) break;
      const clubs = getClubs(l.countryCode, l.slug);
      for (const c of clubs) {
        if (out[tier].length >= 3) break;
        if (seen.has(c.name)) continue;
        seen.add(c.name);
        out[tier].push(c.name);
      }
    }
  }
  return out;
}

export default function LeaguesPage() {
  let state;
  try {
    state = readState();
  } catch {
    state = { profile: undefined, events: [] as never[] };
  }
  const derived = deriveClub(state.events ?? [], state.profile);
  const currentTier = derived.leagueTier;
  const progress = progressToNextTier(derived.verifiedChallenges);
  const featured = featuredByTier();

  return (
    <main className="page">
      <div className="container stack" style={{ gap: "var(--space-6)" }}>
        <header className="stack rise rise-1" style={{ gap: "var(--space-2)", textAlign: "center" }}>
          <span className="badge badge--amber" style={{ alignSelf: "center" }}>The Cup Ladder</span>
          <h1 style={{ margin: 0 }}>Airport Cup</h1>
          <p className="muted" style={{ maxWidth: 620, margin: "0 auto" }}>
            Five tiers of touristy glory. Every verified challenge on your travels earns your
            way up the ladder — from the Check-In Cup all the way to the Airport Champions League.
          </p>
          <div className="row" style={{ justifyContent: "center", marginTop: "var(--space-2)" }}>
            <span className="badge badge--accent">Currently: {LEAGUES[currentTier]}</span>
            {progress.need > 0 && (
              <span className="badge">
                {progress.have}/{progress.need} to {LEAGUES[progress.nextTier!]}
              </span>
            )}
          </div>
        </header>

        <div className="stack" style={{ gap: "var(--space-5)" }}>
          {LEAGUES.map((name, tier) => {
            const grand = tier >= 3; // Airport Cup + ACL are the big ones
            const locked = tier > currentTier;
            const isCurrent = tier === currentTier;
            const threshold = TIER_THRESHOLDS[tier];
            const meta = TIER_META[tier];
            const clubs = featured[tier] ?? [];

            return (
              <article
                key={name}
                className={`card rise ${isCurrent ? "glow" : ""}`}
                style={{
                  padding: grand ? "var(--space-6)" : "var(--space-5)",
                  borderColor: isCurrent
                    ? "var(--accent)"
                    : grand
                      ? "var(--accent-2)"
                      : "var(--line)",
                  opacity: locked ? 0.72 : 1,
                  background: grand
                    ? "linear-gradient(135deg, var(--bg-raised), rgba(251,191,36,0.06))"
                    : "var(--bg-raised)",
                  boxShadow: grand ? "0 0 32px rgba(251,191,36,0.12)" : undefined,
                }}
              >
                <div className="spread" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
                  <div className="row" style={{ gap: "var(--space-4)", alignItems: "center" }}>
                    <span
                      aria-hidden
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: grand ? "2.4rem" : "1.6rem",
                        color: grand ? "var(--accent-2)" : "var(--fg-muted)",
                        minWidth: grand ? 56 : 40,
                        textAlign: "center",
                        opacity: 0.85,
                      }}
                    >
                      {tier + 1}
                    </span>
                    <div className="stack" style={{ gap: 4 }}>
                      <div className="row" style={{ gap: "var(--space-2)" }}>
                        <h2 style={{ margin: 0, fontSize: grand ? "2rem" : "1.4rem" }}>{name}</h2>
                        {locked && <span aria-label="locked" title="locked">🔒</span>}
                        {isCurrent && <span className="badge badge--accent">You are here</span>}
                        {grand && !isCurrent && <span className="badge badge--amber">Marquee</span>}
                      </div>
                      <span className="muted" style={{ fontSize: grand ? "0.95rem" : "0.85rem" }}>
                        {meta.tagline}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 140 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: grand ? "1.4rem" : "1.1rem" }}>
                      {threshold === 0 ? "Entry tier" : `${threshold} verified`}
                    </div>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      {threshold === 0 ? "no requirement" : "challenges to reach"}
                    </div>
                  </div>
                </div>

                {/* progress bar on the current tier */}
                {isCurrent && progress.need > 0 && (
                  <div style={{ marginTop: "var(--space-4)" }}>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 999,
                        background: "var(--bg-overlay)",
                        border: "1px solid var(--line)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, (progress.have / progress.need) * 100)}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, var(--accent-strong), var(--accent))",
                        }}
                      />
                    </div>
                    <div className="muted" style={{ fontSize: "0.8rem", marginTop: "var(--space-2)" }}>
                      {progress.have} of {progress.need} verified challenges toward promotion
                    </div>
                  </div>
                )}

                {/* locked -> unlock requirement */}
                {locked && (
                  <div className="row" style={{ marginTop: "var(--space-4)", gap: "var(--space-2)" }}>
                    <span className="badge">
                      🔒 Unlock at {threshold} verified challenges ({derived.verifiedChallenges}/{threshold})
                    </span>
                  </div>
                )}

                {/* featured clubs */}
                {clubs.length > 0 && (
                  <div style={{ marginTop: "var(--space-4)" }}>
                    <div className="muted" style={{ fontSize: "0.75rem", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Featured clubs
                    </div>
                    <div className="row" style={{ gap: "var(--space-2)" }}>
                      {clubs.map((c) => (
                        <span key={c} className={grand ? "badge badge--amber" : "badge"}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn--ghost" href="/club">Back to your club</Link>
          <Link className="btn btn--amber" href="/guide">Earn challenges in the Local Guide</Link>
        </div>
      </div>
    </main>
  );
}
