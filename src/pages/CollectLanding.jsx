// src/pages/CollectLanding.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function CollectLanding() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);

  // counts from RPC
  const [counts, setCounts] = useState(null);
  const [countsErr, setCountsErr] = useState(null);

  // ---------- load collect_poll by code ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collect_polls")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error("load collect_polls error:", error);
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

  // ---------- load counts via RPC ----------
  async function fetchCounts() {
    setCountsErr(null);
    const { data, error } = await supabase.rpc("collect_counts", { _code: code });
    if (error) {
      console.error("collect_counts RPC error:", error);
      setCountsErr(error.message || "Could not load counts");
      setCounts(null);
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setCounts(row || null);
    }
  }

  // first load + refresh while active
  useEffect(() => {
    let timer;
    if (!code) return;

    fetchCounts();

    const active = (poll?.status || "").toLowerCase();
    const shouldRefresh = active === "collecting" || active === "voting";

    if (shouldRefresh) {
      timer = setInterval(fetchCounts, 10000); // 10s
    }
    return () => { if (timer) clearInterval(timer); };
  }, [code, poll?.status]);

  const status = useMemo(() => (poll?.status || "").toLowerCase(), [poll]);

  if (loading) {
    return (
      <div className="wrap">
        <div className="col">
          <section className="card section">
            <h1 className="hdr">Loading…</h1>
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
            <p className="help">We couldn’t find a collection room for code “{code}”.</p>
            <div className="stack">
              <button className="btn btn-outline" onClick={() => nav("/")}>Home</button>
            </div>
          </section>
        </div>
        <ThemeStyles />
      </div>
    );
  }

  const opts = counts?.options_count ?? 0;
  const contrib = counts?.contributors_count ?? 0;
  const ballots = counts?.ballots_count ?? 0;

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          {/* Header */}
          <div className="head-row">
            <h1 className="hdr">{poll.title || "Poll"}</h1>
            <span className="badge">Code: {code}</span>
          </div>

          {/* Badges */}
          <div className="badges-row">
            <span className="badge">Status: {status}</span>
            {!!Number(poll.target_participants_hint) && (
              <span className="badge">Target: {poll.target_participants_hint}</span>
            )}
          </div>

          {/* Counts */}
          <div className="stats">
            <div className="stat">
              <div className="stat-num">{opts}</div>
              <div className="stat-label">Options</div>
            </div>
            <div className="stat">
              <div className="stat-num">{contrib}</div>
              <div className="stat-label">Contributors</div>
            </div>
            <div className="stat">
              <div className="stat-num">{ballots}</div>
              <div className="stat-label">Ballots</div>
            </div>
          </div>

          {countsErr && <p className="error text-pad">{countsErr}</p>}

          {/* Guidance */}
          <p className="note text-pad">
            Share the code <strong>{code}</strong> with participants.
            {status === "collecting" && " They can add their options until you open voting."}
            {status === "voting" && " Voting is open — send voters to the ballot."}
            {status === "closed" && " Voting is closed — you can review the results."}
          </p>

          {/* Actions */}
          <div className="stack">
            {status === "collecting" && (
              <button className="btn btn-primary" onClick={() => nav(`/collect/${code}/add`)}>
                Add Options
              </button>
            )}
            {status === "voting" && (
              <button className="btn btn-primary" onClick={() => nav(`/vote/${code}`)}>
                Go to Vote
              </button>
            )}
            {status === "closed" && (
              <button className="btn btn-primary" onClick={() => nav(`/results/${code}`)}>
                View Results
              </button>
            )}
            <button
              className="btn btn-outline"
              onClick={() => nav(`/collect/${code}/host`)}
              title="Enter a PIN to manage the room"
            >
              Host Options
            </button>
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
  --container: min(520px, 92vw);
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

/* Badges + header */
.head-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.badges-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:6px 0 2px; }
.badge{
  padding:6px 12px; border-radius:999px;
  background: linear-gradient(180deg, rgba(255,140,0,.10), rgba(255,140,0,.06));
  border:1px solid rgba(255,140,0,.45);
  color:#ffb25a; letter-spacing:.06em; font-weight:700; font-size:.9rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}

/* Stats cards */
.stats{
  display:grid; gap:12px; margin:14px 0 6px;
  grid-template-columns: repeat(3, 1fr);
}
@media (max-width:520px){ .stats{ grid-template-columns: 1fr; } }
.stat{
  padding:14px; border-radius:14px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.14));
  border:1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
  text-align:center;
}
.stat-num{ font-size:1.4rem; font-weight:800; color:var(--ink); }
.stat-label{ color:var(--muted); font-size:.9rem; margin-top:4px; }

/* Notes / text blocks */
.note{
  margin:12px 0 10px; padding:12px; border-radius:12px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,140,0,.25);
  box-shadow: 0 0 14px rgba(255,140,0,.12) inset;
  color: var(--ink);
}
.text-pad{ margin-top:8px; }
.error{ color:#ff6b6b; font-size:.95rem; }

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
