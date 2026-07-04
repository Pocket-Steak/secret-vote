// src/pages/Vote.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { wideTheme } from "../lib/theme.js";

function ThemeStyles() { return <style>{wideTheme}</style>; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtHM(ms) {
  if (ms <= 0) return "0h 0m";
  const mTotal = Math.floor(ms / 60000);
  const h = Math.floor(mTotal / 60);
  const m = mTotal % 60;
  return `${h}h ${m}m`;
}

export default function Vote() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [optionsOrder, setOptionsOrder] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [activeRank, setActiveRank] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [redirectIn, setRedirectIn] = useState(5);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("polls").select("*").eq("code", code).maybeSingle();
      if (!cancelled) {
        if (error) { console.error(error); setPoll(null); }
        else if (data?.options && Array.isArray(data.options)) {
          const seen = new Set();
          const deduped = data.options.filter((opt) => {
            const norm = String(opt ?? "").trim().toLowerCase();
            if (!norm || seen.has(norm)) return false;
            seen.add(norm); return true;
          });
          setPoll({ ...data, options: deduped });
          setOptionsOrder(shuffle(deduped));
          setRanks(Array(deduped.length).fill(null));
          setActiveRank(0);
        } else { setPoll(data); }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const status = useMemo(() => {
    if (!poll) return "missing";
    const closes = new Date(poll.closes_at).getTime();
    const expires = new Date(poll.expires_at).getTime();
    if (now >= expires) return "expired";
    if (now >= closes) return "closed";
    return "open";
  }, [poll, now]);

  useEffect(() => {
    if (status === "closed") nav(`/results/${code}`, { state: { tooSlow: true } });
  }, [status, nav, code]);

  const N = poll?.options?.length ?? 0;
  const assigned = new Set(ranks.filter(Boolean));
  const available = optionsOrder.filter((o) => !assigned.has(o));
  const timeLeft = poll ? Math.max(0, new Date(poll.closes_at).getTime() - now) : 0;

  function chooseOption(opt) {
    setRanks((r) => {
      if (activeRank >= r.length) return r;
      const next = [...r]; next[activeRank] = opt;
      const nextIdx = next.findIndex((x) => x === null);
      setActiveRank(nextIdx === -1 ? r.length - 1 : nextIdx);
      return next;
    });
  }
  function clearRank(i) {
    setRanks((r) => { const next = [...r]; next[i] = null; setActiveRank(i); return next; });
  }

  async function submitVote() {
    if (!poll) return;
    if (ranks.some((x) => x === null)) { alert("Please complete all ranks before submitting."); return; }
    const { error } = await supabase.from("votes").insert({
      poll_id: poll.id, ranks, created_at: new Date().toISOString(),
    });
    if (error) { console.error(error); alert("Could not submit your vote. Please try again."); return; }
    setSubmitted(true);
  }

  useEffect(() => {
    if (!submitted) return;
    setRedirectIn(5);
    const t = setInterval(() => {
      setRedirectIn((x) => {
        if (x <= 1) { clearInterval(t); nav(`/results/${code}`, { state: { thanks: true } }); return 0; }
        return x - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted, nav, code]);

  if (loading) return (
    <>
      <div className="wrap"><div className="col">
        <div className="card section">
          <div className="skel skel-title" />
          <div className="skel skel-line" />
          <div className="skel skel-line short" />
          <div className="skel skel-btn" />
        </div>
      </div></div>
      <ThemeStyles />
    </>
  );

  if (!poll) return (
    <div className="wrap"><div className="col">
      <section className="card section">
        <h1 className="hdr">Room {code}</h1>
        <p className="help">We couldn't find this poll.</p>
        <div className="stack"><button className="btn btn-outline" onClick={() => nav("/")}>Home</button></div>
      </section>
    </div><ThemeStyles /></div>
  );

  if (status === "expired") return (
    <div className="wrap"><div className="col">
      <section className="card section">
        <h1 className="hdr">{poll.title}</h1>
        <p className="help" style={{ marginTop: 8 }}>This page has gone the way of your New Year's resolutions.</p>
        <div className="stack"><button className="btn btn-outline" onClick={() => nav("/")}>Home</button></div>
      </section>
    </div><ThemeStyles /></div>
  );

  if (submitted) return (
    <div className="wrap"><div className="col">
      <section className="card section">
        <h1 className="hdr">Thanks for voting in "{poll.title}"</h1>
        <p className="help">Sending you to the live results… ({redirectIn}s)</p>
        <div className="stack" style={{ marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => nav(`/results/${code}`)}>Skip to Results</button>
        </div>
      </section>
    </div><ThemeStyles /></div>
  );

  const submitDisabled = ranks.some((x) => x === null);

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          <div className="head-row">
            <h1 className="hdr">{poll.title}</h1>
            <div className="timer">Ends in {fmtHM(timeLeft)}</div>
          </div>

          <div className="ranks">
            {ranks.map((val, i) => {
              const isActive = i === activeRank;
              const filled = val !== null;
              return (
                <div
                  key={i}
                  className={`rank-row${isActive ? " is-active" : ""}${filled ? " is-filled" : ""}`}
                  onClick={() => setActiveRank(i)}
                >
                  <div className="rank-badge">{i + 1}</div>
                  <div className="rank-content">
                    {filled ? (
                      <div className="chip-locked">
                        <span className="chip-text">{val}</span>
                        <button className="chip-clear" onClick={(e) => { e.stopPropagation(); clearRank(i); }} title="Clear" aria-label={`Clear rank ${i + 1}`}>✕</button>
                      </div>
                    ) : (
                      <span className="placeholder">Pick option for rank #{i + 1}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid">
            {available.map((opt) => (
              <button key={opt} className={`chip${activeRank < N ? " glow" : ""}`} onClick={() => chooseOption(opt)} title={`Set as #${activeRank + 1}`}>
                {opt}
              </button>
            ))}
          </div>

          <div className="actions">
            <button className="btn btn-outline" onClick={() => nav(`/room/${code}`)}>Back</button>
            <button className="btn btn-primary" disabled={submitDisabled} onClick={submitVote}>Submit Vote</button>
          </div>
        </section>
      </div>
      <ThemeStyles />
      <style>{`
        .ranks { display: grid; gap: 12px; margin-top: 8px; }
        .rank-row {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap; cursor: pointer;
          padding: 12px; border-radius: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .rank-row.is-active { border-color: rgba(255,140,0,.55); box-shadow: inset 0 2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(255,140,0,.18); }
        .rank-row.is-filled { background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.16)); }
        .rank-badge { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 999px; border: 1px solid rgba(255,140,0,.9); color: #ffb25a; font-weight: 800; box-shadow: 0 0 10px rgba(255,140,0,.35); }
        .rank-content { flex: 1 1 220px; min-width: 0; }
        .placeholder { opacity: .6; }
        .grid { display: grid; gap: 12px; margin-top: 16px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
        .chip { padding: 12px 14px; border-radius: 12px; text-align: center; font-weight: 700; background: #121727; color: var(--ink); border: 1px solid #2d3345; cursor: pointer; transition: transform .08s ease, box-shadow .12s ease, filter .12s ease; }
        .chip:hover { transform: translateY(-1px); }
        .chip.glow { border-color: rgba(255,140,0,.85); box-shadow: 0 8px 18px rgba(255,140,0,.25), 0 0 8px rgba(255,140,0,.35) inset; }
        @keyframes chipIn { 0% { transform: scale(0.86); opacity: 0.5; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
        .chip-locked { display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 999px; background: #181f33; color: var(--ink); border: 1px solid rgba(255,140,0,.85); box-shadow: 0 0 12px rgba(255,140,0,.35); animation: chipIn .22s ease; }
        .chip-text { max-width: 60ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .chip-clear { border: 1px solid #344; background: transparent; color: #cfd3df; border-radius: 8px; padding: 2px 6px; cursor: pointer; }
        .chip-clear:hover { filter: brightness(1.2); }
        .actions { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}
