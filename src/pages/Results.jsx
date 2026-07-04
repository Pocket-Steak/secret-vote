// src/pages/Results.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { wideTheme } from "../lib/theme.js";

function ThemeStyles() { return <style>{wideTheme}</style>; }

function fmtHM(ms) {
  if (ms <= 0) return "0h 0m";
  const mTotal = Math.floor(ms / 60000);
  const h = Math.floor(mTotal / 60);
  const m = mTotal % 60;
  return `${h}h ${m}m`;
}

function FancyCrown({ size = 22 }) {
  const gradId = "crownGrad_" + Math.random().toString(36).slice(2);
  const glowId = "crownGlow_" + Math.random().toString(36).slice(2);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"
      style={{ flex: "0 0 auto", filter: "drop-shadow(0 0 6px rgba(255,140,0,.55))" }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffe7a1" />
          <stop offset="55%" stopColor="#ffc04d" />
          <stop offset="100%" stopColor="#ff9b00" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="12" y="46" width="40" height="8" rx="3" fill={`url(#${gradId})`} stroke="#d06b00" strokeWidth="2" filter={`url(#${glowId})`} />
      <path d="M8 44 L16 22 L28 34 L36 20 L48 34 L56 22 L60 44 Z" fill={`url(#${gradId})`} stroke="#d06b00" strokeWidth="2.5" filter={`url(#${glowId})`} />
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

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("polls").select("*").eq("code", code).maybeSingle();
      if (!cancelled) {
        if (error) { console.error(error); setPoll(null); } else { setPoll(data); }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!poll?.id) return;
    let cancelled = false;
    const read = async () => {
      const { data, error } = await supabase.from("poll_results").select("*").eq("poll_id", poll.id);
      if (!cancelled) {
        if (error) { console.error(error); setRows([]); }
        else { setRows(Array.isArray(data) ? data : []); }
      }
    };
    read();
    const t = setInterval(read, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [poll?.id]);

  const status = useMemo(() => {
    if (!poll) return "missing";
    const closesAt = new Date(poll.closes_at).getTime();
    const expiresAt = new Date(poll.expires_at).getTime();
    if (now >= expiresAt) return "expired";
    if (now >= closesAt) return "closed";
    return "open";
  }, [poll, now]);

  const weights = useMemo(() => {
    const scheme = Array.isArray(poll?.point_scheme) ? poll.point_scheme : [];
    return scheme.map((n) => Number(n) || 0);
  }, [poll?.point_scheme]);

  const totals = useMemo(() => {
    const opts = Array.isArray(poll?.options) ? poll.options : [];
    const map = new Map(opts.map((o) => [o, 0]));
    for (const r of rows) {
      if (map.has(r.option)) map.set(r.option, (map.get(r.option) || 0) + (Number(r.points) || 0));
    }
    const arr = Array.from(map.entries()).map(([option, points]) => ({ option, points }));
    arr.sort((a, b) => (b.points - a.points) || a.option.localeCompare(b.option));
    let rank = 1;
    for (let i = 0; i < arr.length; i++) {
      if (i > 0 && arr[i].points === arr[i - 1].points) {
        arr[i].rank = arr[i - 1].rank; arr[i].tie = true; arr[i - 1].tie = true;
      } else { arr[i].rank = rank; }
      rank = i + 2;
    }
    return arr;
  }, [rows, poll?.options]);

  const ballotsCount = useMemo(() => {
    const S = weights.reduce((a, b) => a + b, 0);
    if (!S) return 0;
    return Math.round(totals.reduce((a, r) => a + r.points, 0) / S);
  }, [weights, totals]);

  const maxPts = totals[0]?.points || 1;
  const timeLeft = Math.max(0, (poll ? new Date(poll.closes_at).getTime() : 0) - now);

  if (loading) return (
    <>
      <div className="wrap"><div className="col">
        <div className="card section">
          <div className="skel skel-title" />
          <div className="skel skel-line" />
          <div className="skel skel-line" />
          <div className="skel skel-line short" />
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

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          {state?.tooSlow && <div className="note" style={{ marginBottom: 12 }}>Too slow — voting's over, but here are the results.</div>}
          {state?.thanks && <div className="note" style={{ marginBottom: 12 }}>Thanks for voting! You're viewing live results.</div>}

          <div className="head-row">
            <h1 className="hdr">{poll.title}</h1>
            <div className="timer">
              {status === "open" ? <>Ends in {fmtHM(timeLeft)}</> : <>Voting Closed</>}
            </div>
          </div>

          <div className="badges-row">
            <span className="badge">Code: {code}</span>
            <span className="badge">Ballots: {ballotsCount}</span>
          </div>

          <div className="results">
            {totals.map((row) => {
              const isWinner = row.rank === 1;
              const pct = maxPts > 0 ? Math.round((row.points / maxPts) * 100) : 0;
              return (
                <div key={row.option} className={`result-row${isWinner ? " first" : ""}`}>
                  <div className="rank-cell">
                    <span className="rank-num">{row.rank}</span>
                    {isWinner && <FancyCrown size={22} />}
                    {row.tie && <span className="tie-badge">TIE</span>}
                  </div>
                  <div className="result-body">
                    <div className="result-top">
                      <div className={`option-cell${isWinner ? " winner" : ""}`}>{row.option}</div>
                      <div className="points-cell">{row.points} pts</div>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="actions">
            <button className="btn btn-outline" onClick={() => nav(`/room/${code}`)}>Back to Room</button>
            <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
          </div>
        </section>
      </div>
      <ThemeStyles />
      <style>{`
        .results { display: grid; gap: 12px; margin-top: 12px; }
        .result-row {
          display: flex; align-items: flex-start; gap: 12px; min-width: 0;
          padding: 12px; border-radius: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
        }
        .result-row.first {
          border-color: rgba(255,140,0,.85);
          background: linear-gradient(180deg, rgba(255,140,0,.18), rgba(255,140,0,.06));
          box-shadow: inset 0 2px 6px rgba(0,0,0,.35), 0 0 0 1px rgba(255,140,0,.35), 0 10px 22px rgba(255,140,0,.28);
        }
        .rank-cell { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; padding-top: 2px; }
        .rank-num {
          width: 36px; height: 36px; display: grid; place-items: center; border-radius: 999px;
          border: 1px solid rgba(255,140,0,.9); color: #ffb25a; font-weight: 800;
          background: rgba(255,140,0,.08); box-shadow: 0 0 10px rgba(255,140,0,.35); flex: 0 0 auto;
        }
        .tie-badge { padding: 2px 8px; border-radius: 999px; font-size: .8rem; font-weight: 800; border: 1px solid rgba(255,140,0,.75); color: #ffb25a; }
        .result-body { flex: 1 1 0; min-width: 0; }
        .result-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .option-cell { font-weight: 800; flex: 1 1 0; min-width: 0; }
        .option-cell.winner { text-shadow: 0 0 10px rgba(255,140,0,.65); }
        .points-cell { margin-left: auto; text-align: right; flex: 0 0 auto; font-variant-numeric: tabular-nums; color: var(--muted); font-size: .9rem; }
        .bar-track { width: 100%; height: 4px; background: rgba(255,255,255,.08); border-radius: 2px; margin-top: 8px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent-2), var(--accent)); border-radius: 2px; transition: width .7s cubic-bezier(.22,.68,0,1.1); }
        .actions { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}
