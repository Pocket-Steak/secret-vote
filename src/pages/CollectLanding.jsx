// src/pages/CollectLanding.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { narrowTheme } from "../lib/theme.js";

function ThemeStyles() { return <style>{narrowTheme}</style>; }

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
      <style>{`
        .stats { display: grid; gap: 12px; margin: 14px 0 6px; grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 520px) { .stats { grid-template-columns: 1fr; } }
        .stat { padding: 14px; border-radius: 14px; background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.14)); border: 1px solid rgba(255,255,255,.08); box-shadow: inset 0 2px 6px rgba(0,0,0,.35); text-align: center; }
        .stat-num { font-size: 1.4rem; font-weight: 800; color: var(--ink); }
        .stat-label { color: var(--muted); font-size: .9rem; margin-top: 4px; }
        .text-pad { margin-top: 8px; }
      `}</style>
    </div>
  );
}
