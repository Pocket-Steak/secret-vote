// src/pages/Landing.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Landing() {
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();
  const nav = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // LIVE rows from poll_results (to compute ballot count like Results.jsx)
  const [rows, setRows] = useState([]);

  // load poll
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .eq("code", code)
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        console.error(error);
        setPoll(null);
      } else {
        setPoll(data);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [code]);

  // refresh poll_results every 2s (only after poll is known)
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
    return () => { cancelled = true; clearInterval(t); };
  }, [poll?.id]);

  // countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const endsText = useMemo(() => {
    if (!poll?.closes_at) return "";
    const end = new Date(poll.closes_at).getTime();
    const diff = Math.max(0, end - now);
    if (diff <= 0) return "Voting closed";
    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
  }, [poll, now]);

  // compute ballotsCount the same way Results.jsx does
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
    return Array.from(map.entries()).map(([option, points]) => ({ option, points }));
  }, [rows, poll?.options]);

  const ballots = useMemo(() => {
    const perBallot = weights.reduce((a, b) => a + b, 0);
    if (!perBallot) return 0;
    const totalPoints = totals.reduce((a, r) => a + (Number(r.points) || 0), 0);
    return Math.round(totalPoints / perBallot);
  }, [weights, totals]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {/* ignore */}
  }

  if (loading) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <div className="help">Loading…</div>
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
            <h1 className="hdr">Not found</h1>
            <p className="help">We couldn’t find a room with code “{code}”.</p>
            <div className="stack">
              <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
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
          <div className="head-row">
            <h1 className="hdr">Poll launched!</h1>
            <span className="timer">{endsText || "—"}</span>
          </div>

          {/* Share panel */}
          <div className="panel">
            <div className="label" style={{ marginBottom: 8 }}>
              Share this code with voters:
            </div>

            <div className="share-row">
              <div className="code-pill" title="Room code">{code}</div>
              <button className={`btn ${copied ? "btn-primary" : "btn-outline"}`} onClick={copyCode}>
                {copied ? "Copied!" : "Copy Room Code"}
              </button>
            </div>

            <div className="badges-row" style={{ marginTop: 10 }}>
              <span className="badge">{endsText || "—"}</span>
              <span className="badge">Ballots: {ballots}</span>
            </div>

            <div className="actions">
              <button className="btn btn-primary" onClick={() => nav(`/vote/${code}`)}>
                Vote
              </button>
              <button className="btn btn-outline" onClick={() => nav(`/results/${code}`)}>
                View Results
              </button>
            </div>
          </div>

          <div className="stack" style={{ marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
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

/* Panel */
.panel{
  margin-top: 6px; padding:16px; border-radius:16px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,140,0,.25);
  box-shadow: 0 0 14px rgba(255,140,0,.10) inset;
}
.label{ font-weight:800; }

/* Share row */
.share-row{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.code-pill{
  display:inline-flex; align-items:center; justify-content:center;
  padding:12px 16px; border-radius:14px; font-weight:900; letter-spacing:.12em;
  background: #181f33; color: var(--ink);
  border:1px solid rgba(255,140,0,.85);
  box-shadow: 0 8px 18px rgba(255,140,0,.25), 0 0 8px rgba(255,140,0,.35) inset;
}

/* Badges row */
.badges-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.badge{
  padding:6px 12px; border-radius:999px;
  background: linear-gradient(180deg, rgba(255,140,0,.10), rgba(255,140,0,.06));
  border:1px solid rgba(255,140,0,.45);
  color:#ffb25a; letter-spacing:.06em; font-weight:700; font-size:.9rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}

/* Actions */
.actions{ display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; }

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
