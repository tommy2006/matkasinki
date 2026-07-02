"use client";

// Local guide: sourced challenges for the destination with a sustainability
// toggle (prioritizes sustainable). Completing one opens a proof panel that
// requires >=2 of {geolocation, photo, matching receipt}, then POSTs to
// /api/guide/complete for a verified verdict.

import { useMemo, useState } from "react";

export interface GuideChallenge {
  id: string;
  title: string;
  description?: string;
  placeId: string;
  difficulty: "easy" | "medium" | "hard";
  sustainable: boolean;
  reward: { kind: "player" | "staff" | "league" | "fixture"; ref: string };
  sources: string[];
}

export interface ReceiptOption {
  index: number;
  label: string;
}

const DIFF_BADGE: Record<GuideChallenge["difficulty"], string> = {
  easy: "badge badge--accent",
  medium: "badge",
  hard: "badge badge--amber",
};

const REWARD_LABEL: Record<GuideChallenge["reward"]["kind"], string> = {
  player: "Scout a player",
  staff: "Recruit staff",
  league: "Unlock a league",
  fixture: "Book a fixture",
};

type Proof = {
  geo?: { lat: number; lng: number };
  photo?: { name: string; size: number };
  receiptIndex?: number;
};

type Verdict = {
  ok: boolean;
  message: string;
} | null;

export default function GuideClient({
  destination,
  challenges,
  sustainableDefault,
  receipts,
}: {
  destination: string;
  challenges: GuideChallenge[];
  sustainableDefault: boolean;
  receipts: ReceiptOption[];
}) {
  const [sustainableFirst, setSustainableFirst] = useState(sustainableDefault);
  const [openId, setOpenId] = useState<string | null>(null);

  const ordered = useMemo(() => {
    const list = [...challenges];
    if (sustainableFirst) {
      list.sort((a, b) => Number(b.sustainable) - Number(a.sustainable));
    }
    return list;
  }, [challenges, sustainableFirst]);

  return (
    <div className="stack">
      <div className="spread rise rise-1">
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <h1 style={{ margin: 0 }}>Local guide — {destination}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Web-sourced challenges for a place you don&apos;t know yet. Complete them with real proof
            to scout players, staff, and fixtures for your club.
          </p>
        </div>
      </div>

      <div className="card rise rise-2 spread">
        <div className="stack" style={{ gap: 2 }}>
          <strong>Sustainability first</strong>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            Prioritise low-impact, community-positive challenges.
          </span>
        </div>
        <button
          className={sustainableFirst ? "btn" : "btn btn--ghost"}
          onClick={() => setSustainableFirst((v) => !v)}
        >
          {sustainableFirst ? "🌱 On" : "Off"}
        </button>
      </div>

      <div className="stack rise rise-3">
        {ordered.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            receipts={receipts}
            open={openId === c.id}
            onToggle={() => setOpenId((id) => (id === c.id ? null : c.id))}
          />
        ))}
      </div>
    </div>
  );
}

function ChallengeCard({
  challenge,
  receipts,
  open,
  onToggle,
}: {
  challenge: GuideChallenge;
  receipts: ReceiptOption[];
  open: boolean;
  onToggle: () => void;
}) {
  const [proof, setProof] = useState<Proof>({});
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>(null);

  const proofCount = [proof.geo, proof.photo, proof.receiptIndex != null ? {} : undefined].filter(
    Boolean
  ).length;

  function captureGeo() {
    setGeoErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Geolocation not available in this browser");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProof((p) => ({ ...p, geo: { lat: pos.coords.latitude, lng: pos.coords.longitude } }));
        setGeoBusy(false);
      },
      (err) => {
        setGeoErr(err.message || "Could not get your location");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function capturePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setProof((p) => ({ ...p, photo: { name: f.name, size: f.size } }));
  }

  async function complete() {
    if (proofCount < 2) {
      setVerdict({ ok: false, message: "Add at least two forms of proof to submit." });
      return;
    }
    setSubmitting(true);
    setVerdict(null);
    try {
      const res = await fetch("/api/guide/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, proof }),
      });
      const data = await res.json().catch(() => null);
      const ok = res.ok && (data?.verified ?? data?.ok ?? true) && !data?.rejected;
      if (ok) {
        setVerdict({
          ok: true,
          message: data?.message ?? "Verified! Scout report incoming — check your Club!",
        });
      } else {
        setVerdict({
          ok: false,
          message: data?.message ?? data?.error ?? "Not enough proof — verification rejected.",
        });
      }
    } catch {
      setVerdict({ ok: false, message: "Could not reach the verifier. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card stack">
      <div className="spread">
        <div className="row">
          <span className={DIFF_BADGE[challenge.difficulty]} style={{ textTransform: "capitalize" }}>
            {challenge.difficulty}
          </span>
          {challenge.sustainable && <span className="badge badge--accent">🌱 Sustainable</span>}
        </div>
        <span className="badge badge--amber">🎁 {REWARD_LABEL[challenge.reward.kind]}</span>
      </div>

      <h3 style={{ margin: 0 }}>{challenge.title}</h3>
      {challenge.description && <p className="muted" style={{ margin: 0 }}>{challenge.description}</p>}

      {challenge.sources.length > 0 && (
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Sources:</span>
          {challenge.sources.map((src) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="badge"
              style={{ fontSize: "0.75rem" }}
            >
              {hostOf(src)}
            </a>
          ))}
        </div>
      )}

      <div className="row">
        <button className={open ? "btn btn--ghost" : "btn"} onClick={onToggle}>
          {open ? "Close" : "Complete"}
        </button>
        {verdict?.ok && <span className="badge badge--accent">✓ Verified</span>}
      </div>

      {open && (
        <div className="card stack" style={{ background: "var(--bg-overlay)" }}>
          <div className="spread">
            <strong>Prove it — need any 2 of 3</strong>
            <span className={proofCount >= 2 ? "badge badge--accent" : "badge"}>
              {proofCount} / 3 provided
            </span>
          </div>

          <div className="grid grid--3">
            <div className="stack" style={{ gap: "var(--space-2)" }}>
              <button className="btn btn--ghost" onClick={captureGeo} disabled={geoBusy}>
                📍 {geoBusy ? "Locating…" : proof.geo ? "Location ✓" : "Share location"}
              </button>
              {proof.geo && (
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {proof.geo.lat.toFixed(4)}, {proof.geo.lng.toFixed(4)}
                </span>
              )}
              {geoErr && <span className="badge badge--amber">{geoErr}</span>}
            </div>

            <div className="stack" style={{ gap: "var(--space-2)" }}>
              <label className="btn btn--ghost" style={{ cursor: "pointer" }}>
                📷 {proof.photo ? "Photo ✓" : "Upload photo"}
                <input type="file" accept="image/*" hidden onChange={capturePhoto} />
              </label>
              {proof.photo && (
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {proof.photo.name} ({Math.round(proof.photo.size / 1024)} KB)
                </span>
              )}
            </div>

            <div className="stack" style={{ gap: "var(--space-2)" }}>
              <select
                className="input"
                value={proof.receiptIndex ?? ""}
                onChange={(e) =>
                  setProof((p) => ({
                    ...p,
                    receiptIndex: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              >
                <option value="">🧾 Match a receipt…</option>
                {receipts.map((r) => (
                  <option key={r.index} value={r.index}>{r.label}</option>
                ))}
              </select>
              {receipts.length === 0 && (
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  No receipts yet — log one in Budget.
                </span>
              )}
            </div>
          </div>

          <div className="row">
            <button className="btn btn--amber" onClick={complete} disabled={submitting}>
              {submitting ? "Verifying…" : "Submit proof"}
            </button>
            {verdict && (
              <span className={verdict.ok ? "badge badge--accent" : "badge badge--amber"}>
                {verdict.ok ? "✓ " : "✗ "}
                {verdict.message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}
