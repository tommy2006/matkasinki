"use client";

// Reading list: a curated 5-book set matched to the traveller's vibe, each with a
// why-match and a destination tie. Marking a book "Finished" grants manager XP.

import { useMemo, useState } from "react";

interface Book {
  title: string;
  author: string;
  why: string;
}

const SETS: Record<string, { blurb: string; books: Book[] }> = {
  explorer: {
    blurb: "For the restless map-reader who reads to go further.",
    books: [
      { title: "The Songlines", author: "Bruce Chatwin", why: "Walking as a way of knowing a place — pure wander fuel." },
      { title: "The Old Ways", author: "Robert Macfarlane", why: "Ancient paths and the shape of landscapes underfoot." },
      { title: "In Patagonia", author: "Bruce Chatwin", why: "The template for chasing a place to its edge." },
      { title: "The Great Railway Bazaar", author: "Paul Theroux", why: "Movement for its own sake, one train at a time." },
      { title: "Wild", author: "Cheryl Strayed", why: "One long walk that rearranges a life." },
    ],
  },
  foodie: {
    blurb: "For the traveller who plans the trip around lunch.",
    books: [
      { title: "The Apprentice", author: "Jacques Pépin", why: "A life told through kitchens and technique." },
      { title: "Kitchen Confidential", author: "Anthony Bourdain", why: "The messy, honest underbelly of eating well." },
      { title: "Salt Fat Acid Heat", author: "Samin Nosrat", why: "Turns every market stall into a lesson." },
      { title: "The Omnivore's Dilemma", author: "Michael Pollan", why: "Ask where the plate came from — you'll travel differently." },
      { title: "Rice, Noodle, Fish", author: "Matt Goulding", why: "Japan through its regional obsessions." },
    ],
  },
  culture: {
    blurb: "For the reader who wants the story behind the stones.",
    books: [
      { title: "The Shadow of the Wind", author: "Carlos Ruiz Zafón", why: "A city becomes a character you can walk into." },
      { title: "The Leopard", author: "Giuseppe Tomasi di Lampedusa", why: "A place and an era caught mid-change." },
      { title: "A Time of Gifts", author: "Patrick Leigh Fermor", why: "Europe on foot with an eye for every fresco." },
      { title: "The Hare with Amber Eyes", author: "Edmund de Waal", why: "Objects, cities, and inheritance across a century." },
      { title: "Istanbul", author: "Orhan Pamuk", why: "Melancholy, memory, and a city's soul." },
    ],
  },
  relax: {
    blurb: "For the trip where doing less is the whole point.",
    books: [
      { title: "A Year in Provence", author: "Peter Mayle", why: "Slow living made delicious and funny." },
      { title: "The Summer Book", author: "Tove Jansson", why: "An island, a grandmother, and time slowing down." },
      { title: "H is for Hawk", author: "Helen Macdonald", why: "Stillness, grief, and paying close attention." },
      { title: "Gilead", author: "Marilynne Robinson", why: "A quiet book that rewards a quiet week." },
      { title: "The Enchanted April", author: "Elizabeth von Arnim", why: "A getaway that gently reshapes everyone in it." },
    ],
  },
  adventure: {
    blurb: "For when the itinerary has a summit on it.",
    books: [
      { title: "Into Thin Air", author: "Jon Krakauer", why: "The mountain that demands respect, at full altitude." },
      { title: "Touching the Void", author: "Joe Simpson", why: "Survival stripped to its rawest decisions." },
      { title: "The Worst Journey in the World", author: "Apsley Cherry-Garrard", why: "Antarctic hardship that recalibrates 'difficult'." },
      { title: "Endurance", author: "Alfred Lansing", why: "Leadership and grit at the end of the earth." },
      { title: "Annapurna", author: "Maurice Herzog", why: "The first 8,000m summit, and its price." },
    ],
  },
};

const VIBE_ALIASES: Record<string, keyof typeof SETS> = {
  explorer: "explorer",
  wanderer: "explorer",
  adventurer: "adventure",
  adventure: "adventure",
  foodie: "foodie",
  gourmet: "foodie",
  culture: "culture",
  historian: "culture",
  relaxer: "relax",
  relax: "relax",
  chill: "relax",
};

export default function ReadingClient({ vibe, destination }: { vibe: string; destination: string }) {
  const setKey = VIBE_ALIASES[vibe.toLowerCase()] ?? "explorer";
  const set = useMemo(() => SETS[setKey], [setKey]);
  const [finished, setFinished] = useState<Record<string, boolean>>({});
  const [xp, setXp] = useState(0);

  function finish(title: string) {
    if (finished[title]) return;
    setFinished((f) => ({ ...f, [title]: true }));
    setXp((x) => x + 25);
  }

  return (
    <div className="stack">
      <div className="spread rise rise-1">
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <h1 style={{ margin: 0 }}>Reading list</h1>
          <p className="muted" style={{ margin: 0 }}>
            Matched to your <span className="badge badge--accent">{vibe}</span> vibe. {set.blurb}
          </p>
        </div>
        {xp > 0 && <span className="badge badge--amber">+{xp} manager XP</span>}
      </div>

      <div className="stack rise rise-2">
        {set.books.map((b, i) => (
          <div key={b.title} className="card spread">
            <div className="stack" style={{ gap: "var(--space-2)", flex: 1 }}>
              <div className="row">
                <span className="badge">#{i + 1}</span>
                <strong style={{ fontSize: "1.1rem" }}>{b.title}</strong>
                <span className="muted">by {b.author}</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>{b.why}</p>
              {destination && (
                <span className="badge badge--accent" style={{ alignSelf: "flex-start" }}>
                  📍 A good companion for {destination}
                </span>
              )}
            </div>
            <button
              className={finished[b.title] ? "btn btn--ghost" : "btn"}
              onClick={() => finish(b.title)}
              disabled={finished[b.title]}
            >
              {finished[b.title] ? "✓ Finished (+25 XP)" : "Mark finished"}
            </button>
          </div>
        ))}
      </div>

      {xp > 0 && (
        <div className="card glow rise rise-3" style={{ border: "1px solid var(--accent-2)" }}>
          <div className="row">
            <span aria-hidden style={{ fontSize: "1.4rem" }}>📚</span>
            <span className="muted">
              You&apos;ve banked <strong>{xp} manager XP</strong> from finishing books — sharper reads
              make sharper tactics back at the club.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
