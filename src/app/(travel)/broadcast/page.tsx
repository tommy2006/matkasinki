"use client";

// /broadcast — THE WOW MOMENT. A matchday-TV narration of the saved itinerary.
// Scoreboard bar, one slide per stop with big display type + lower-third,
// auto-advance with progress bar, transport controls, and aural commentary via
// window.speechSynthesis (guarded — never crashes if unavailable).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  templateCommentary,
  templateIntro,
  templateOutro,
  type BroadcastSlide,
  type BroadcastMeta,
} from "@/agents/narrator/templates";

interface Script {
  intro: string;
  lines: string[];
  outro: string;
  source: string;
}

const SLIDE_MS = 6000;

// Sample itinerary so /broadcast is a showpiece even with no saved trip.
const SAMPLE_META: BroadcastMeta = {
  destination: "Porto, Portugal",
  clubName: "Ribeira Rovers",
  totalDays: 3,
};
const SAMPLE_SLIDES: BroadcastSlide[] = [
  { day: 1, kicker: "DAY 1 — MORNING", title: "Ribeira riverfront walk", sub: "Cross the top deck of Dom Luís I for the classic panorama" },
  { day: 1, kicker: "DAY 1 — AFTERNOON", title: "Port cellar tasting in Gaia", sub: "Three-glass tasting with a view over the river" },
  { day: 1, kicker: "DAY 1 — EVENING", title: "Sunset at Jardim do Morro", sub: "The whole of old Porto turning amber" },
  { day: 2, kicker: "DAY 2 — MORNING", title: "São Bento azulejos + Clérigos climb", sub: "20,000 hand-painted tiles, then 225 steps up" },
  { day: 2, kicker: "DAY 2 — AFTERNOON", title: "Six Bridges river cruise", sub: "Fifty minutes on the Douro" },
  { day: 2, kicker: "DAY 2 — EVENING", title: "Petiscos dinner in Baixa", sub: "Small plates the Porto way" },
  { day: 3, kicker: "DAY 3 — MORNING", title: "Foz do Douro lighthouse walk", sub: "Where the Douro meets the Atlantic" },
  { day: 3, kicker: "DAY 3 — EVENING", title: "Fado night at a taberna", sub: "Intimate, unamplified, unforgettable" },
];

/** Normalise a saved-itinerary payload into broadcast slides. Best-effort. */
function slidesFromItinerary(data: unknown): { slides: BroadcastSlide[]; meta: BroadcastMeta } | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const trip = (obj.trip ?? obj) as Record<string, unknown>;
  const itinRaw =
    (trip.itinerary as unknown) ??
    (obj.itinerary as unknown) ??
    (obj.days as unknown);
  const days = Array.isArray(itinRaw)
    ? itinRaw
    : Array.isArray((itinRaw as { days?: unknown })?.days)
      ? (itinRaw as { days: unknown[] }).days
      : [];
  if (!Array.isArray(days) || days.length === 0) return null;

  const slides: BroadcastSlide[] = [];
  days.forEach((d, di) => {
    const day = d as { day?: number; theme?: string; items?: unknown[] };
    const dayNum = typeof day.day === "number" ? day.day : di + 1;
    const items = Array.isArray(day.items) ? day.items : [];
    items.forEach((it) => {
      const item = it as { time?: string; title?: string; notes?: string };
      if (!item || typeof item.title !== "string") return;
      slides.push({
        day: dayNum,
        kicker: `DAY ${dayNum}${item.time ? ` — ${item.time}` : ""}`.toUpperCase(),
        title: item.title,
        sub: item.notes,
      });
    });
  });
  if (slides.length === 0) return null;

  const destination =
    (typeof trip.destination === "string" && trip.destination) ||
    (typeof obj.destination === "string" && obj.destination) ||
    "your destination";
  const totalDays = days.length;
  const clubName =
    (obj.profile as { clubName?: string })?.clubName ??
    (trip.clubName as string | undefined);

  return { slides, meta: { destination, clubName, totalDays } };
}

export default function BroadcastPage() {
  const [slides, setSlides] = useState<BroadcastSlide[]>([]);
  const [meta, setMeta] = useState<BroadcastMeta>(SAMPLE_META);
  const [script, setScript] = useState<Script | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const rafRef = useRef<number | null>(null);
  const slideStartRef = useRef<number>(0);
  const ttsOk = useRef<boolean>(false);

  useEffect(() => {
    ttsOk.current =
      typeof window !== "undefined" && "speechSynthesis" in window;
  }, []);

  // Fetch the script. Try the "reads saved trip" contract first; if the route
  // needs slides (400 / empty), build them from the saved trip or the sample.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      let useSlides = SAMPLE_SLIDES;
      let useMeta = SAMPLE_META;

      // Attempt to recover a real saved itinerary (route contracts vary while
      // built in parallel — try a couple of read endpoints, ignore failures).
      const built = await tryLoadSavedTrip();
      if (built) {
        useSlides = built.slides;
        useMeta = built.meta;
      }

      // Build a deterministic fallback script immediately so we can render
      // even if /api/narrator misbehaves.
      const fallback: Script = {
        intro: templateIntro(useMeta),
        lines: useSlides.map((s, i) => templateCommentary(s, i, useMeta)),
        outro: templateOutro(useMeta),
        source: "template",
      };

      try {
        // First: the {} contract (server reads the saved trip).
        let res = await fetch("/api/narrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        let data = await safeJson(res);

        const usable = (d: unknown) =>
          Array.isArray((d as Script)?.lines) &&
          (d as Script).lines.length > 0;

        // If that didn't yield a script, POST the slides we have.
        if (!res.ok || !usable(data)) {
          res = await fetch("/api/narrator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slides: useSlides, meta: useMeta }),
          });
          data = await safeJson(res);
        }

        if (cancelled) return;

        if (usable(data)) {
          const s = data as Script;
          // Align script length with slide count defensively.
          const lines = useSlides.map((_, i) => s.lines[i] ?? fallback.lines[i]);
          setSlides(useSlides);
          setMeta(useMeta);
          setScript({ intro: s.intro || fallback.intro, lines, outro: s.outro || fallback.outro, source: s.source || "claude" });
        } else {
          setSlides(useSlides);
          setMeta(useMeta);
          setScript(fallback);
        }
        setPhase("ready");
      } catch {
        if (cancelled) return;
        setSlides(useSlides);
        setMeta(useMeta);
        setScript(fallback);
        setPhase("ready");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = slides.length;

  // The full sequence: intro slide, each stop, outro slide.
  const sequence = useMemo(() => {
    if (!script || total === 0) return [];
    const items: { kicker: string; title: string; sub?: string; day?: number; line: string; kind: "intro" | "stop" | "outro" }[] = [];
    items.push({ kicker: "KICK-OFF", title: meta.destination, sub: meta.clubName ? `${meta.clubName} on tour` : "Your Itinerary", line: script.intro, kind: "intro" });
    slides.forEach((s, i) => {
      items.push({ kicker: s.kicker, title: s.title, sub: s.sub, day: s.day, line: script.lines[i] ?? "", kind: "stop" });
    });
    items.push({ kicker: "FULL TIME", title: meta.destination, sub: "That's the itinerary", line: script.outro, kind: "outro" });
    return items;
  }, [script, slides, meta, total]);

  const seqLen = sequence.length;
  const current = sequence[index];

  // Speak the current line (guarded).
  const speak = useCallback(
    (text: string) => {
      if (!ttsOk.current || muted || !text) return;
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.06;
        u.pitch = 1.05;
        u.volume = 1;
        // Prefer a lively English voice if one is available.
        const voices = synth.getVoices?.() ?? [];
        const pick =
          voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|arthur/i.test(v.name)) ??
          voices.find((v) => /en-GB/i.test(v.lang)) ??
          voices.find((v) => /^en/i.test(v.lang));
        if (pick) u.voice = pick;
        synth.speak(u);
      } catch {
        /* speech unavailable — silent, never crash */
      }
    },
    [muted],
  );

  // On slide change: reset the clock and (re)speak.
  useEffect(() => {
    if (phase !== "ready" || !current) return;
    slideStartRef.current = performance.now();
    setElapsed(0);
    if (ttsOk.current && !muted) speak(current.line);
    else if (ttsOk.current) {
      try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  // Cancel speech on unmount.
  useEffect(() => {
    return () => {
      if (ttsOk.current) {
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
      }
    };
  }, []);

  const goto = useCallback(
    (i: number) => {
      if (seqLen === 0) return;
      const next = ((i % seqLen) + seqLen) % seqLen;
      setIndex(next);
    },
    [seqLen],
  );

  // Auto-advance loop with a progress bar driven by requestAnimationFrame.
  useEffect(() => {
    if (phase !== "ready" || !playing || seqLen === 0) return;
    slideStartRef.current = performance.now() - elapsed;

    const tick = (now: number) => {
      const e = now - slideStartRef.current;
      setElapsed(e);
      if (e >= SLIDE_MS) {
        setIndex((prev) => (prev + 1) % seqLen);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, phase, seqLen]);

  function togglePlay() {
    setPlaying((p) => {
      const next = !p;
      if (!next && ttsOk.current) {
        try { window.speechSynthesis.pause(); } catch { /* noop */ }
      } else if (next && ttsOk.current) {
        try { window.speechSynthesis.resume(); } catch { /* noop */ }
      }
      return next;
    });
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (next && ttsOk.current) {
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
      } else if (!next && current) {
        speak(current.line);
      }
      return next;
    });
  }

  // Match clock: minute per sequence step, ticking within the slide.
  const clockMin = Math.min(90, index * 6 + Math.floor((elapsed / SLIDE_MS) * 6));
  const progress = Math.min(1, elapsed / SLIDE_MS);
  const dayCounter =
    current?.kind === "stop" && current.day
      ? `DAY ${current.day} / ${meta.totalDays}`
      : current?.kind === "intro"
        ? "KICK-OFF"
        : "FULL TIME";

  return (
    <main className="bc-root">
      <style>{css}</style>

      {phase === "loading" && (
        <div className="bc-loading">
          <div className="bc-ball" aria-hidden>⚽</div>
          <p className="muted">Warming up the gantry…</p>
        </div>
      )}

      {phase === "ready" && current && (
        <div className="bc-stage">
          {/* Scoreboard */}
          <div className="bc-scoreboard">
            <div className="bc-team">
              <span className="bc-team__name">{truncate(meta.destination, 22)}</span>
            </div>
            <div className="bc-clock">
              <span className="bc-live">
                <i className="bc-live__dot" /> LIVE
              </span>
              <span className="bc-clock__time">{clockMin}&apos;</span>
              <span className="bc-clock__day">{dayCounter}</span>
            </div>
            <div className="bc-team bc-team--right">
              <span className="bc-team__name">
                {meta.clubName ? truncate(meta.clubName, 22) : "Your Itinerary"}
              </span>
            </div>
          </div>

          {/* Slide */}
          <div key={index} className="bc-slide">
            <span className="bc-kicker">{current.kicker}</span>
            <h1 className="bc-title">{current.title}</h1>
            {current.sub && <p className="bc-sub">{current.sub}</p>}

            {/* Lower third: the spoken commentary */}
            <div className="bc-lower">
              <span className="bc-lower__tag">COMMENTARY</span>
              <p className="bc-lower__line">{current.line}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="bc-progress">
            <div className="bc-progress__fill" style={{ width: `${progress * 100}%` }} />
          </div>

          {/* Controls */}
          <div className="bc-controls">
            <button className="bc-btn" onClick={() => goto(index - 1)} aria-label="Previous">⏮</button>
            <button className="bc-btn bc-btn--play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? "⏸" : "▶"}
            </button>
            <button className="bc-btn" onClick={() => goto(index + 1)} aria-label="Next">⏭</button>
            <button
              className={`bc-btn ${muted ? "bc-btn--off" : ""}`}
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              title={ttsOk.current ? (muted ? "Unmute commentary" : "Mute commentary") : "Audio unavailable"}
              disabled={!ttsOk.current}
            >
              {muted || !ttsOk.current ? "🔇" : "🔊"}
            </button>
            <span className="bc-count muted">
              {index + 1} / {seqLen}
            </span>
          </div>

          {/* Dot strip */}
          <div className="bc-dots">
            {sequence.map((_, i) => (
              <button
                key={i}
                className={`bc-dot ${i === index ? "bc-dot--on" : ""}`}
                onClick={() => goto(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="bc-footer">
            {!ttsOk.current && (
              <span className="muted bc-note">
                Voice commentary isn&apos;t available in this browser — captions only.
              </span>
            )}
            {script?.source === "template" && (
              <span className="muted bc-note">Commentary: house gantry team</span>
            )}
            <Link href="/plan" className="btn btn--ghost">← Back to the plan</Link>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="bc-loading">
          <p className="muted">The broadcast dropped out. Try refreshing.</p>
          <Link href="/plan" className="btn btn--ghost">← Back to the plan</Link>
        </div>
      )}
    </main>
  );
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Try to recover the saved trip from whatever read endpoint exists. All
// failures are swallowed — we fall back to the sample itinerary.
async function tryLoadSavedTrip(): Promise<{ slides: BroadcastSlide[]; meta: BroadcastMeta } | null> {
  const endpoints = ["/api/plan", "/api/trip", "/api/state"];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) continue;
      const data = await safeJson(res);
      const built = slidesFromItinerary(data);
      if (built) return built;
    } catch {
      /* try next */
    }
  }
  return null;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

const css = `
.bc-root {
  min-height: calc(100vh - 52px);
  background:
    radial-gradient(1200px 500px at 50% -10%, rgba(52,211,153,0.10), transparent 60%),
    radial-gradient(900px 400px at 50% 110%, rgba(251,191,36,0.08), transparent 60%),
    var(--bg);
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-5);
}
.bc-loading { text-align: center; }
.bc-ball { font-size: 3rem; animation: bc-roll 0.9s linear infinite; }
@keyframes bc-roll { to { transform: rotate(360deg); } }

.bc-stage { width: 100%; max-width: 960px; }

.bc-scoreboard {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--space-3);
  background: linear-gradient(180deg, var(--bg-overlay), var(--bg-raised));
  border: 1px solid var(--line); border-radius: var(--radius);
  padding: 12px 18px; box-shadow: var(--shadow);
}
.bc-team { min-width: 0; }
.bc-team--right { text-align: right; }
.bc-team__name {
  font-family: var(--font-display); font-weight: 700; font-size: 1.05rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
}
.bc-clock { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.bc-live {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-display); font-weight: 700; font-size: 0.7rem;
  letter-spacing: 0.08em; color: var(--danger);
}
.bc-live__dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--danger);
  animation: bc-blink 1s steps(1) infinite;
}
@keyframes bc-blink { 50% { opacity: 0.15; } }
.bc-clock__time { font-family: var(--font-display); font-weight: 700; font-size: 1.5rem; color: var(--accent-2); line-height: 1; }
.bc-clock__day { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.08em; color: var(--fg-muted); }

.bc-slide {
  margin-top: var(--space-5); padding: var(--space-7) var(--space-5) var(--space-6);
  text-align: center; animation: bc-in 0.5s cubic-bezier(0.2,0.7,0.3,1) both;
  min-height: 320px; display: flex; flex-direction: column; justify-content: center;
}
@keyframes bc-in { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: none; } }
.bc-kicker { font-family: var(--font-display); font-weight: 700; font-size: 0.85rem; letter-spacing: 0.14em; color: var(--accent); }
.bc-title { font-size: clamp(2.2rem, 6vw, 4rem); margin: var(--space-3) 0 var(--space-3); }
.bc-sub { font-size: clamp(1rem, 2.4vw, 1.35rem); color: var(--fg-muted); max-width: 640px; margin: 0 auto; }

.bc-lower {
  margin: var(--space-6) auto 0; max-width: 720px; text-align: left;
  background: rgba(11,14,20,0.7); border-left: 4px solid var(--accent-2);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 12px 18px; backdrop-filter: blur(4px);
}
.bc-lower__tag { font-family: var(--font-display); font-weight: 700; font-size: 0.66rem; letter-spacing: 0.12em; color: var(--accent-2); }
.bc-lower__line { margin: 4px 0 0; font-size: 1.05rem; line-height: 1.5; }

.bc-progress { margin-top: var(--space-5); height: 5px; border-radius: 999px; background: var(--bg-overlay); border: 1px solid var(--line); overflow: hidden; }
.bc-progress__fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius: 999px; }

.bc-controls { margin-top: var(--space-5); display: flex; align-items: center; justify-content: center; gap: var(--space-3); }
.bc-btn {
  width: 48px; height: 48px; border-radius: 50%; font-size: 1.1rem;
  background: var(--bg-overlay); color: var(--fg); border: 1px solid var(--line);
  cursor: pointer; display: grid; place-items: center; transition: all 0.15s ease;
}
.bc-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
.bc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.bc-btn--play { width: 60px; height: 60px; font-size: 1.4rem; background: var(--accent); color: #06281c; border: none; }
.bc-btn--play:hover:not(:disabled) { color: #06281c; filter: brightness(1.1); }
.bc-btn--off { color: var(--fg-muted); }
.bc-count { margin-left: var(--space-3); font-family: var(--font-display); font-size: 0.85rem; }

.bc-dots { margin-top: var(--space-4); display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; }
.bc-dot { width: 9px; height: 9px; border-radius: 50%; border: none; background: var(--line); cursor: pointer; padding: 0; transition: all 0.15s; }
.bc-dot:hover { background: var(--fg-muted); }
.bc-dot--on { background: var(--accent); transform: scale(1.25); }

.bc-footer { margin-top: var(--space-5); display: flex; align-items: center; justify-content: center; gap: var(--space-4); flex-wrap: wrap; }
.bc-note { font-size: 0.78rem; }
`;
