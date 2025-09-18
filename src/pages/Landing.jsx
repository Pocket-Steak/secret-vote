// src/pages/Landing.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function Landing() {
  const { code } = useParams();
  const nav = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // NEW: ballots state
  const [ballots, setBallots] = useState(0);

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
    return () => {
      mounted = false;
    };
  }, [code]);

  // NEW: poll ballots — refresh every 2s
  useEffect(() => {
    if (!poll?.id) return;
    let cancelled = false;

    const fetchCount = async () => {
      // Count rows in `votes` for this poll
      const { count, error } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("poll_id", poll.id);
      if (!cancelled) {
        if (error) {
          console.error(error);
          setBallots(0);
        } else {
          setBallots(count ?? 0);
        }
      }
    };

    fetchCount();
    const t = setInterval(fetchCount, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
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

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div style={s.wrap}>
        <div style={s.container}>
          <div style={{ opacity: 0.8 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div style={s.wrap}>
        <div style={s.container}>
          <h1 style={s.title}>Not found</h1>
          <p style={{ opacity: 0.8 }}>We couldn’t find a room with code “{code}”.</p>
          <button style={s.secondaryBtn} onClick={() => nav("/")}>
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.container}>
        <h1 style={s.title}>Poll launched!</h1>

        <div style={s.shareBox}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Share this code with voters:
          </div>

          <div style={s.shareRow}>
            <div style={s.codePill} title="Room code">
              {code}
            </div>
            <button onClick={copyCode} style={s.copyBtn} title="Copy room code">
              {copied ? "Copied!" : "Copy Room Code"}
            </button>
          </div>

          {/* Info row: countdown + ballots */}
          <div style={s.infoRow}>
            <div style={s.badge}>{endsText}</div>
            <div style={s.badge}>Ballots: {ballots}</div>
          </div>

          {/* Actions */}
          <div style={s.actionsRow}>
            <button style={s.primaryBtn} onClick={() => nav(`/vote/${code}`)}>
              Vote
            </button>
            <button style={s.secondaryBtn} onClick={() => nav(`/results/${code}`)}>
              View Results
            </button>
          </div>
        </div>

        <button style={s.linkBtn} onClick={() => nav("/")}>
          Home
        </button>
      </div>
    </div>
  );
}

const s = {
  // phone-safe outer shell
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
    overflowX: "hidden",
  },
  // container/card
  container: {
    width: "100%",
    maxWidth: 720,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
    margin: "0 auto",
  },
  title: {
    margin: 0,
    fontSize: "clamp(22px, 4.5vw, 28px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
  },
  // share panel
  shareBox: {
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,140,0,.25)",
    boxShadow: "0 0 14px rgba(255,140,0,.25) inset",
  },
  // code + copy row — wraps on phones
  shareRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  codePill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,140,0,.5)",
    background: "rgba(255,140,0,.08)",
    color: "#ffd9b3",
    fontWeight: 800,
    letterSpacing: 1,
  },
  copyBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
  },

  // NEW: info row for countdown + ballots
  infoRow: {
    display: "flex",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #333",
    background: "#121727",
    fontSize: 12,
    letterSpacing: 0.5,
    color: "#e9e9f1",
  },

  // action buttons — wrap nicely on small screens
  actionsRow: {
    display: "flex",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  },
  primaryBtn: {
    padding: "12px 18px",
    borderRadius: 12,
    border: "none",
    background: ORANGE,
    color: "#000",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(255,140,0,.8)",
  },
  secondaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
  },
  linkBtn: {
    marginTop: 16,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "transparent",
    color: "#bbb",
    cursor: "pointer",
  },
};
