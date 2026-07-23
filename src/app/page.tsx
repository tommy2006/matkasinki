import Link from "next/link";

// Landing page. The app opens here; each card leads to one of the planners.
export default function Home() {
  return (
    <main className="page">
      <div className="container home">
        <style>{css}</style>

        <header className="stack rise rise-1" style={{ gap: "var(--space-3)", textAlign: "center", alignItems: "center" }}>
          <span className="badge badge--accent">HSL region · zones A–E</span>
          <h1 style={{ marginBottom: 0, maxWidth: 720 }}>
            Get anywhere in Helsinki, the smart way.
          </h1>
          <p className="muted" style={{ maxWidth: 620, marginBottom: 0 }}>
            Matkasinki plans your way across HSL trains, metro, trams, buses and ferries —
            weather-aware, on the real Digitransit map. Ask in plain language, or build a
            route stop by stop.
          </p>
          <div className="row" style={{ justifyContent: "center", marginTop: "var(--space-3)" }}>
            <Link href="/chat" className="btn btn--lg">💬 Ask the planner</Link>
            <Link href="/journey" className="btn btn--ghost btn--lg">🚇 Build a journey</Link>
          </div>
        </header>

        <div className="grid grid--3 rise rise-2" style={{ marginTop: "var(--space-8)" }}>
          <Link href="/chat" className="card card--interactive home-card">
            <span className="home-icon" style={{ background: "#ff6319" }}>💬</span>
            <h3 style={{ marginBottom: "var(--space-2)" }}>Chat planner</h3>
            <p className="muted" style={{ margin: 0 }}>
              Describe the day you want — &ldquo;a museum day starting from Kamppi&rdquo; — and the
              AI agent finds the places, plans the HSL route and saves it to the map.
            </p>
          </Link>

          <Link href="/journey" className="card card--interactive home-card">
            <span className="home-icon" style={{ background: "#00985f" }}>🚇</span>
            <h3 style={{ marginBottom: "var(--space-2)" }}>Journey builder</h3>
            <p className="muted" style={{ margin: 0 }}>
              Add two or more stops and get the fastest path across HSL vehicles, with the
              zone ticket you need and today&apos;s weather factored in.
            </p>
          </Link>

          <Link href="/routes" className="card card--interactive home-card">
            <span className="home-icon" style={{ background: "#8c4799" }}>🗺️</span>
            <h3 style={{ marginBottom: "var(--space-2)" }}>Saved routes</h3>
            <p className="muted" style={{ margin: 0 }}>
              Every plan you save is kept and drawn on the map, so you can pull it up again
              when you actually head out.
            </p>
          </Link>
        </div>

        <p className="muted rise rise-3" style={{ textAlign: "center", marginTop: "var(--space-7)", fontSize: "0.85rem" }}>
          Live routing from Digitransit · weather from Open-Meteo · covers HSL zones A–E
        </p>
      </div>
    </main>
  );
}

const css = `
.home { max-width: 1000px; }
.home-card { display: block; color: inherit; text-decoration: none; }
.home-card:hover { text-decoration: none; }
.home-icon {
  display: grid; place-items: center;
  width: 44px; height: 44px; border-radius: var(--radius-sm);
  font-size: 1.3rem; margin-bottom: var(--space-4);
}
`;
