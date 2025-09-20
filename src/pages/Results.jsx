// src/pages/Results.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

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
  // unique ids so multiple crowns don't clash
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
    return ScreenWrap(
      <div style={styles.card}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={styles.text}>Loading…</p>
      </div>
    );
  }
  if (!poll) {
    return ScreenWrap(
      <div style={styles.card}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={styles.text}>We couldn’t find this poll. Double-check the code.</p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }
  if (status === "expired") {
    return ScreenWrap(
      <div style={styles.card}>
        <h1 style={styles.title}>{poll.title}</h1>
        <p style={{ ...styles.text, marginTop: 8 }}>
          This page has gone the way of your New Year’s resolutions.
        </p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  return ScreenWrap(
    <div style={styles.card}>
      {state?.tooSlow && <Banner text="Too slow — voting’s over, but here are the results." />}
      {state?.thanks && <Banner text="Thanks for voting! You’re viewing live results." />}

      <div style={styles.headerRow}>
        <h1 style={styles.title}>{poll.title}</h1>
        <div style={styles.timer}>
          {status === "open" ? <>Ends in {fmtHM(timeLeft)}</> : <>Voting Closed</>}
        </div>
      </div>
      <div style={styles.subRow}>
        <span style={styles.badge}>Code: {code}</span>
        <span style={styles.badge}>Ballots: {ballotsCount}</span>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {totals.map((row) => {
          const isWinner = row.rank === 1;
          return (
            <div
              key={row.option}
              style={{
                ...styles.resultRow,
                ...(isWinner ? styles.firstPlace : {}),
              }}
            >
              <div style={styles.rankCell}>
                <span style={styles.rankNum}>{row.rank}</span>
                {isWinner && <FancyCrown size={22} />}
                {row.tie && <span style={styles.tieBadge}>TIE</span>}
              </div>
              <div style={{ ...styles.optionCell, ...(isWinner ? styles.optionWinner : {}) }}>
                {row.option}
              </div>
              <div style={styles.pointsCell}>{row.points} pts</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={styles.secondaryBtn} onClick={() => nav(`/room/${code}`)}>Back to Room</button>
        <button style={styles.linkBtn} onClick={() => nav("/")}>Home</button>
      </div>
    </div>
  );
}

/* ---------- helpers / styles ---------- */
function Banner({ text }) {
  return <div style={styles.banner}>{text}</div>;
}
function ScreenWrap(children) {
  return <div style={styles.wrap}>{children}</div>;
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
    overflowX: "hidden",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
    margin: "0 auto",
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    fontSize: "clamp(22px, 4.5vw, 28px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
    margin: 0,
  },
  timer: { fontWeight: 700, color: "#ffd9b3", textShadow: "0 0 8px rgba(255,140,0,.6)" },

  subRow: { marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  badge: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #333",
    background: "#121727",
    letterSpacing: 1,
    fontSize: 12,
  },

  resultRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #222",
    minWidth: 0,
  },

  // Winner: gentle gradient + stronger glow
  firstPlace: {
    borderColor: ORANGE,
    boxShadow:
      "0 0 0 1px rgba(255,140,0,.35) inset, 0 0 18px rgba(255,140,0,.55), 0 0 40px rgba(255,140,0,.25)",
    background: "linear-gradient(180deg, rgba(255,140,0,.18), rgba(255,140,0,.06))",
  },

  rankCell: { display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" },
  rankNum: {
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    border: `1px solid ${ORANGE}`,
    color: ORANGE,
    fontWeight: 800,
    background: "rgba(255,140,0,.08)",
  },
  tieBadge: {
    marginLeft: 6,
    padding: "2px 8px",
    borderRadius: 999,
    border: `1px solid ${ORANGE}`,
    color: ORANGE,
    fontSize: 12,
  },

  optionCell: { fontWeight: 700, minWidth: 0, flex: "1 1 200px" },
  optionWinner: { textShadow: "0 0 10px rgba(255,140,0,.65)" },

  pointsCell: {
    marginLeft: "auto",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    flex: "0 0 auto",
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
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "transparent",
    color: "#aaa",
    cursor: "pointer",
  },

  text: { opacity: 0.9 },
  banner: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    background: "rgba(255,140,0,.08)",
    border: `1px solid rgba(255,140,0,.4)`,
    color: "#ffd9b3",
  },
};
