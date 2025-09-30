// src/pages/Results.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

/* --- small helper for minutes-only time --- */
function fmtHM(ms) {
  if (ms <= 0) return "0h 0m";
  const mTotal = Math.floor(ms / 60000);
  const h = Math.floor(mTotal / 60);
  const m = mTotal % 60;
  return `${h}h ${m}m`;
}

/* --- a static “fancy” crown (SVG gradient + subtle glow) --- */
function FancyCrown({ size = 22 }) {
  const gradId = "crownGrad_" + Math.random().toString(36).slice(2);
  const glowId = "crownGlow_" + Math.random().toString(36).slice(2);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ flex: "0 0 auto", filter: "drop-shadow(0 0 6px rgba(255,140,0,.55))" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffe7a1" />
          <stop offset="55%" stopColor="#ffc04d" />
          <stop offset="100%" stopColor="#ff9b00" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* band */}
      <rect
        x="12"
        y="46"
        width="40"
        height="8"
        rx="3"
        fill={`url(#${gradId})`}
        stroke="#d06b00"
        strokeWidth="2"
        filter={`url(#${glowId})`}
      />
      {/* main crown shape */}
      <path
        d="M8 44 L16 22 L28 34 L36 20 L48 34 L56 22 L60 44 Z"
        fill={`url(#${gradId})`}
        stroke="#d06b00"
        strokeWidth="2.5"
        filter={`url(#${glowId})`}
      />
      {/* jewels */}
      <circle cx="16" cy="22" r="3.2" fill="#fff6c8" stroke="#e0b300" strokeWidth="1" />
      <circle cx="36" cy="20" r="3.2" fill="#fff6c8" stroke="#e0b300" strokeWidth="1" />
      <circle cx="56" cy="22" r="3.2" fill="#fff6c8" stroke="#e0b300" strokeWidth="1" />
    </svg>
  );
}

export default function Results() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  // ---- state
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [rows, setRows] = useState([]); // poll_results rows: { poll_id, option, points }

  // fetch poll
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (!cancelled) {
        if (error) {
          console.error(error);
          setPoll(null);
        } else {
          setPoll(data);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // tick clock every 15s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // refresh results every 2s
  useEffect(() => {
    if (!poll?.id) return;
    let cancelled = false;

    const read = async () => {
      const { data, error } = await supabase
        .from("poll_results")
        .select("*")
        .eq("poll_id", poll.id);
      if (!cancelled) {
        if (error) {
          console.error(error);
          setRows([]);
        } else {
          setRows(Array.isArray(data) ? data : []);
        }
      }
    };

    read();
    const t = setInterval(read, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [poll?.id]);

  // status
  const status = useMemo(() => {
    if (!poll) return "missing";
    const closesAt = new Date(poll.closes_at).getTime();
    const expiresAt = new Date(poll.expires_at).getTime();
    if (now >= expiresAt) return "expired";
    if (now >= closesAt) return "closed";
    return "open";
  }, [poll, now]);

  // weights / totals / ranks
  const weights = useMemo(() => {
    const scheme = Array.isArray(poll?.point_scheme) ? poll.point_scheme : [];
    return scheme.map((n) => Number(n) || 0);
  }, [poll?.point_scheme]);

  const totals = useMemo(() => {
    const opts = Array.isArray(poll?.options) ? poll.options : [];
    const map = new Map(opts.map((o) => [o, 0]));
    for (const r of rows) {
      if (map.has(r.option)) {
        map.set(r.option, (map.get(r.option) || 0) + (Number(r.points) || 0));
      }
    }
    const arr = Array.from(map.entries()).map(([option, points]) => ({
      option,
      points,
    }));
    arr.sort((a, b) => (b.points - a.points) || a.option.localeCompare(b.option));
    // ranks with ties
    let rank = 1;
    for (let i = 0; i < arr.length; i++) {
      if (i > 0 && arr[i].points === arr[i - 1].points) {
        arr[i].rank = arr[i - 1].rank;
        arr[i].tie = true;
        arr[i - 1].tie = true;
      } else {
        arr[i].rank = rank;
      }
      rank = i + 2;
    }
    return arr;
  }, [rows, poll?.options]);

  const ballotsCount = useMemo(() => {
    const S = weights.reduce((a, b) => a + b, 0);
    if (!S) return 0;
    const totalPoints = totals.reduce((a, r) => a + r.points, 0);
    return Math.round(totalPoints / S);
  }, [weights, totals]);

  const timeLeft = Math.max(0, (poll ? new Date(poll.closes_at).getTime() : 0) - now);

  // ---- renders ----
  if (loading) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Room {code}</h1>
            <p className="help">Loading…</p>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }
  if (!poll) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Room {code}</h1>
            <p className="help">We couldn’t find this poll. Double-check the code.</p>
            <div className="stack">
              <button className="btn btn-outline" onClick={() => nav("/")}>
                Home
              </button>
            </div>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }
  if (status === "expired") {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">{poll.title}</h1>
            <p className="help" style={{ marginTop: 8 }}>
              This page has gone the way of your New Year’s resolutions.
            </p>
            <div className="stack">
              <button className="btn btn-outline" onClick={() => nav("/")}>
                Home
              </button>
            </div>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          {/* Banners */}
          {state?.tooSlow && <div className="note">Too slow — voting’s over, but here are the results.</div>}
          {state?.thanks && <div className="note">Thanks for voting! You’re viewing live results.</div>}

          {/* Header */}
          <div className="head-row">
            <h1 className="hdr">{poll.title}</h1>
            <div className="timer">
              {status === "open" ? <>Ends in {fmtHM(timeLeft)}</> : <>Voting Closed</>}
            </div>
          </div>

          {/* Sub badges */}
          <div className="badges-row">
            <span className="badge">Code: {code}</span>
            <span className="badge">Ballots: {ballotsCount}</span>
          </div>

          {/* Results list */}
          <div className="results">
            {totals.map((row) => {
              const isWinner = row.rank === 1;
              return (
                <div
                  key={row.option}
                  className={`result-row${isWinner ? " first" : ""}`}
                >
                  <div className="rank-cell">
                    <span className="rank-num">{row.rank}</span>
                    {isWinner && <FancyCrown size={22} />}
                    {row.tie && <span className="tie-badge">TIE</span>}
                  </div>
                  <div className={`option-cell${isWinner ? " winner" : ""}`}>
                    {row.option}
                  </div>
                  <div className="points-cell">{row.points} pts</div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="actions">
            <button className="btn btn-outline" onClick={() => nav(`/room/${code}`)}>
              Back to Room
            </button>
            <button className="btn btn-outline" onClick={() => nav("/")}>
              Home
            </button>
          </div>
        </section>
      </div>

      <ThemeStyles />
    </div>
  );
}

/** Inline theme so this page matches even without global index.css */
function ThemeStyles() {
  return (
    <style>{`
:root{
  --bg:#0e1116;
  --panel:#1a1f27;
  --ink:#f5efe6;
  --muted:#bfc6d3;
  --accent:#ff8c00;
  --accent-2:#ffb25a;
  --container: min(720px, 94vw);
}

*{box-sizing:border-box}
html,body,#root{min-height:100%}
body{margin:0; background: var(--bg);}

.wrap{
  min-height:100vh; min-height:100svh; min-height:100dvh;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  padding: max(16px, env(safe-area-inset-top)) 18px max(16px, env(safe-area-inset-bottom));
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(255,140,0,.08), transparent 60%),
    radial-gradient(800px 400px at 100% 0%, rgba(255,140,0,.05), transparent 60%),
    var(--bg);
  color:var(--ink);
}
.col{ display:flex; flex-direction:column; align-items:center; gap:16px; width:var(--container); }

.card{
  width:100%;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.08)), var(--panel);
  border:1px solid rgba(255,255,255,.06);
  border-radius:16px; padding:24px;
  box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 10px 24px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.25);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.card:hover{
  transform: translateY(-2px);
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 14px 32px rgba(0,0,0,.45), 0 3px 10px rgba(0,0,0,.3);
  border-color: rgba(255,140,0,.25);
}

.hdr{font-size:1.35rem;font-weight:800;letter-spacing:.2px;margin:0 0 10px;text-shadow:0 1px 0 rgba(0,0,0,.5)}
.help{color:var(--muted);font-size:.95rem;margin:.25rem 0 0}
.stack{display:flex;flex-direction:column;gap:16px}
.section{margin:4px 0 6px}
.head-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }

/* Timer badge */
.timer{
  padding:6px 12px; border-radius:999px;
  background: linear-gradient(180deg, rgba(255,140,0,.12), rgba(255,140,0,.06));
  border:1px solid rgba(255,140,0,.45);
  color:#ffdda8; letter-spacing:.04em; font-weight:800; font-size:.95rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.05) inset;
}

/* Badges row */
.badges-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:6px 0 2px; }
.badge{
  padding:6px 12px; border-radius:999px;
  background: linear-gradient(180deg, rgba(255,140,0,.10), rgba(255,140,0,.06));
  border:1px solid rgba(255,140,0,.45);
  color:#ffb25a; letter-spacing:.06em; font-weight:700; font-size:.9rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}

/* Banner / note */
.note{
  margin-bottom: 12px;
  padding:12px; border-radius:12px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,140,0,.25);
  box-shadow: 0 0 14px rgba(255,140,0,.10) inset;
  color:#ffdda8; font-weight:700;
}

/* Results list */
.results{ display:grid; gap:12px; margin-top:12px; }
.result-row{
  display:flex; align-items:center; gap:12px; flex-wrap:wrap; min-width:0;
  padding:12px; border-radius:14px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
}
.result-row.first{
  border-color: rgba(255,140,0,.85);
  background: linear-gradient(180deg, rgba(255,140,0,.18), rgba(255,140,0,.06));
  box-shadow:
    inset 0 2px 6px rgba(0,0,0,.35),
    0 0 0 1px rgba(255,140,0,.35),
    0 10px 22px rgba(255,140,0,.28),
    0 2px 8px rgba(255,140,0,.25);
}

.rank-cell{ display:flex; align-items:center; gap:8px; flex:0 0 auto; }
.rank-num{
  width:36px; height:36px; display:grid; place-items:center; border-radius:999px;
  border:1px solid rgba(255,140,0,.9); color:#ffb25a; font-weight:800;
  background: rgba(255,140,0,.08);
  box-shadow: 0 0 10px rgba(255,140,0,.35);
}
.tie-badge{
  padding:2px 8px; border-radius:999px; font-size:.8rem; font-weight:800;
  border:1px solid rgba(255,140,0,.75); color:#ffb25a;
}

.option-cell{ font-weight:800; min-width:0; flex:1 1 200px; }
.option-cell.winner{ text-shadow: 0 0 10px rgba(255,140,0,.65); }
.points-cell{
  margin-left:auto; text-align:right; flex:0 0 auto;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

/* Actions */
.actions{
  display:flex; gap:12px; margin-top:16px; flex-wrap:wrap;
}

/* Buttons */
.btn{
  appearance:none; border:none; cursor:pointer; font-weight:800;
  border-radius:14px; padding:14px 18px; width:100%;
  transition: transform .08s ease, box-shadow .12s ease, filter .12s ease, opacity .12s ease;
}
.btn[disabled]{opacity:.7; cursor:not-allowed}
.btn-primary{
  color:#1a1005;
  background: linear-gradient(180deg, var(--accent-2), var(--accent));
  box-shadow: 0 10px 18px rgba(255,140,0,.28), 0 2px 0 rgba(255,140,0,.9) inset, 0 1px 0 rgba(255,255,255,.35) inset;
}
.btn-primary:hover{ filter:brightness(1.05) }
.btn-primary:active{
  transform: translateY(1px);
  box-shadow: 0 6px 12px rgba(255,140,0,.24), 0 1px 0 rgba(140,70,0,.9) inset, 0 0 0 rgba(255,255,255,0) inset;
}
.btn-outline{
  color:var(--accent-2);
  background: linear-gradient(180deg, rgba(255,140,0,.08), rgba(255,140,0,.04));
  border:1px solid rgba(255,140,0,.45);
  box-shadow: 0 6px 14px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}
.btn-outline:hover{
  background: linear-gradient(180deg, rgba(255,140,0,.14), rgba(255,140,0,.06));
}

@media (max-width:600px){ .card{padding:18px} }
    `}</style>
  );
}
