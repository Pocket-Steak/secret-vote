// src/pages/CollectLanding.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CollectLanding() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // read collect_poll by code
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

  // soft refresh every 10s to catch status changes
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const status = useMemo(() => {
    return (poll?.status || "").toLowerCase(); // 'collecting' | 'voting' | 'closed'
  }, [poll]);

  if (loading) {
    return ScreenWrap(
      <div style={styles.container}>
        <h1 style={styles.title}>Loading…</h1>
      </div>
    );
  }
  if (!poll) {
    return ScreenWrap(
      <div style={styles.container}>
        <h1 style={styles.title}>Not found</h1>
        <p style={styles.text}>We couldn’t find a collection room for code “{code}”.</p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  return ScreenWrap(
    <div style={styles.container}>
      <h1 style={styles.title}>{poll.title || "Poll"}</h1>

      <div style={styles.badgesRow}>
        <span style={styles.badge}>Code: {code}</span>
        <span style={styles.badge}>Status: {status}</span>
        {Number(poll.target_participants_hint) > 0 && (
          <span style={styles.badge}>Target: {poll.target_participants_hint}</span>
        )}
      </div>

      <p style={{ ...styles.text, marginTop: 10 }}>
        Share the code <strong>{code}</strong> with participants.
        {status === "collecting" && " They can add their options until you open voting."}
        {status === "voting" && " Voting is open — send voters to the ballot."}
        {status === "closed" && " Voting is closed — you can review the results."}
      </p>

      <div style={styles.actionsRow}>
        {/* collecting → Add Options */}
        {status === "collecting" && (
          <button
            style={styles.primaryBtn}
            onClick={() => nav(`/collect/${code}/add`)}
          >
            Add Options
          </button>
        )}

        {/* voting → Go to Vote */}
        {status === "voting" && (
          <button
            style={styles.primaryBtn}
            onClick={() => nav(`/vote/${code}`)}
          >
            Go to Vote
          </button>
        )}

        {/* closed → Results */}
        {status === "closed" && (
          <button
            style={styles.primaryBtn}
            onClick={() => nav(`/results/${code}`)}
          >
            View Results
          </button>
        )}

        {/* Host options always available */}
        <button
          style={styles.secondaryBtn}
          onClick={() => nav(`/collect/${code}/host`)}
          title="Enter a PIN to manage the room"
        >
          Host Options
        </button>
      </div>

      <button style={styles.linkBtn} onClick={() => nav("/")}>Home</button>
    </div>
  );
}

/* ---------- helpers / styles ---------- */
function ScreenWrap(children) {
  return <div style={styles.wrap}>{children}</div>;
}

const styles = {
  // outer
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
    overflowX: "hidden",
  },
  // card
  container: {
    width: "100%",
    maxWidth: 780,
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
  text: { opacity: 0.9 },

  badgesRow: {
    marginTop: 10,
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  badge: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #333",
    background: "#121727",
    letterSpacing: 1,
    fontSize: 12,
  },

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
