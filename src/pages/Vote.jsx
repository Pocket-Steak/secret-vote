// src/pages/Vote.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

// shuffle helper (Fisher–Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// format H:M (no seconds)
function fmtHM(ms) {
  if (ms <= 0) return "0h 0m";
  const mTotal = Math.floor(ms / 60000);
  const h = Math.floor(mTotal / 60);
  const m = mTotal % 60;
  return `${h}h ${m}m`;
}

export default function Vote() {
  const nav = useNavigate();
  const { state } = useLocation(); // reserved if you want to show “too slow / thanks” banners
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  // ---- state ----
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [optionsOrder, setOptionsOrder] = useState([]); // randomized once per voter
  const [ranks, setRanks] = useState([]);               // best -> worst (strings or null)
  const [activeRank, setActiveRank] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [redirectIn, setRedirectIn] = useState(5);

  // ---- load poll from Supabase ----
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
          // Dedupe options (keep first, case-insensitive) before showing to voter
          if (data?.options && Array.isArray(data.options)) {
            const seen = new Set();
            const deduped = data.options.filter((opt) => {
              const norm = String(opt ?? "").trim().toLowerCase();
              if (!norm) return false;
              if (seen.has(norm)) return false;
              seen.add(norm);
              return true;
            });

            setPoll({ ...data, options: deduped });

            const shuf = shuffle(deduped);
            setOptionsOrder(shuf);
            setRanks(Array(deduped.length).fill(null));
            setActiveRank(0);
          } else {
            setPoll(data);
          }
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  // tick (minutes-only)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // status
  const status = useMemo(() => {
    if (!poll) return "missing";
    const closes = new Date(poll.closes_at).getTime();
    const expires = new Date(poll.expires_at).getTime();
    if (now >= expires) return "expired";
    if (now >= closes) return "closed";
    return "open";
  }, [poll, now]);

  // if closed while on page → redirect to results (discard incomplete ballot)
  useEffect(() => {
    if (status === "closed") {
      nav(`/results/${code}`, { state: { tooSlow: true } });
    }
  }, [status, nav, code]);

  // computed
  const N = poll?.options?.length ?? 0;
  const assigned = new Set(ranks.filter(Boolean));
  const available = optionsOrder.filter((o) => !assigned.has(o));
  const timeLeft = poll ? Math.max(0, new Date(poll.closes_at).getTime() - now) : 0;

  // interactions
  function chooseOption(opt) {
    setRanks((r) => {
      if (activeRank >= r.length) return r;
      const next = [...r];
      next[activeRank] = opt;
      const nextIdx = next.findIndex((x) => x === null);
      setActiveRank(nextIdx === -1 ? r.length - 1 : nextIdx);
      return next;
    });
  }
  function clearRank(i) {
    setRanks((r) => {
      const next = [...r];
      next[i] = null;
      setActiveRank(i);
      return next;
    });
  }

  // submit → insert into Supabase
  async function submitVote() {
    if (!poll) return;
    if (ranks.some((x) => x === null)) {
      alert("Please complete all ranks before submitting.");
      return;
    }
    const { error } = await supabase.from("votes").insert({
      poll_id: poll.id,
      ranks, // array of option strings, best->worst
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error(error);
      alert("Could not submit your vote. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  // thank-you auto-redirect
  useEffect(() => {
    if (!submitted) return;
    setRedirectIn(5);
    const t = setInterval(() => {
      setRedirectIn((x) => {
        if (x <= 1) {
          clearInterval(t);
          nav(`/results/${code}`, { state: { thanks: true } });
          return 0;
        }
        return x - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted, nav, code]);

  // ---- render ----
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
              <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
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
              <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
            </div>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Thanks for voting in “{poll.title}”</h1>
            <p className="help">Sending you to the live results… ({redirectIn}s)</p>
            <div className="stack" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => nav(`/results/${code}`)}>
                Skip to Results
              </button>
            </div>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }

  const submitDisabled = ranks.some((x) => x === null);

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          {/* Header */}
          <div className="head-row">
            <h1 className="hdr">{poll.title}</h1>
            <div className="timer" title="Time remaining">
              Ends in {fmtHM(timeLeft)}
            </div>
          </div>

          {/* Rank slots */}
          <div className="ranks">
            {ranks.map((val, i) => {
              const isActive = i === activeRank;
              const filled = val !== null;
              const rowClass = `rank-row${isActive ? " is-active" : ""}${filled ? " is-filled" : ""}`;
              return (
                <div
                  key={i}
                  className={rowClass}
                  onClick={() => setActiveRank(i)}
                  title={filled ? "Click to make this slot active (you can clear it)" : "Click to fill this slot"}
                >
                  <div className="rank-badge">{i + 1}</div>
                  <div className="rank-content">
                    {filled ? (
                      <div className="chip-locked">
                        <span className="chip-text">{val}</span>
                        <button
                          className="chip-clear"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearRank(i);
                          }}
                          title="Clear this rank"
                          aria-label={`Clear rank ${i + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="placeholder">Pick option for rank #{i + 1}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Available options */}
          <div className="grid">
            {available.map((opt) => (
              <button
                key={opt}
                className={`chip${activeRank < N ? " glow" : ""}`}
                onClick={() => chooseOption(opt)}
                title={`Set as #${activeRank + 1}`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="actions">
            <button className="btn btn-outline" onClick={() => nav(`/room/${code}`)}>
              Back
            </button>
            <button
              className="btn btn-primary"
              disabled={submitDisabled}
              onClick={submitVote}
              title={submitDisabled ? "Complete all ranks" : "Submit your vote"}
            >
              Submit Vote
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

/* Rank list */
.ranks{ display:grid; gap:12px; margin-top:8px; }
.rank-row{
  display:flex; align-items:center; gap:12px; flex-wrap:wrap; cursor:pointer;
  padding:12px; border-radius:14px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
  transition: border-color .15s ease, box-shadow .15s ease, transform .08s ease;
}
.rank-row.is-active{
  border-color: rgba(255,140,0,.55);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(255,140,0,.18);
}
.rank-row.is-filled{ background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.16)); }

.rank-badge{
  width:36px; height:36px; display:grid; place-items:center; flex:0 0 auto;
  border-radius:999px; border:1px solid rgba(255,140,0,.9); color:#ffb25a; font-weight:800;
  box-shadow: 0 0 10px rgba(255,140,0,.35);
}
.rank-content{ flex:1 1 220px; min-width:0 }
.placeholder{ opacity:.6 }

/* Choice chips (available options) */
.grid{
  display:grid; gap:12px; margin-top:16px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}
.chip{
  padding:12px 14px; border-radius:12px; text-align:center; font-weight:700;
  background: #121727; color: var(--ink);
  border:1px solid #2d3345; cursor:pointer;
  transition: transform .08s ease, box-shadow .12s ease, filter .12s ease;
}
.chip:hover{ transform: translateY(-1px); }
.chip.glow{
  border-color: rgba(255,140,0,.85);
  box-shadow: 0 8px 18px rgba(255,140,0,.25), 0 0 8px rgba(255,140,0,.35) inset;
}

/* Selected chip in rank row */
.chip-locked{
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 12px; border-radius:999px;
  background: #181f33; color: var(--ink);
  border:1px solid rgba(255,140,0,.85);
  box-shadow: 0 0 12px rgba(255,140,0,.35);
}
.chip-text{ max-width:60ch; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.chip-clear{
  border:1px solid #344; background:transparent; color:#cfd3df;
  border-radius:8px; padding:2px 6px; cursor:pointer;
}
.chip-clear:hover{ filter:brightness(1.1); }

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

@media (max-width:600px){
  .card{padding:18px}
}
    `}</style>
  );
}
