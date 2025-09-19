// src/pages/Results.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

// minutes-only countdown text
function fmtHM(ms) {
  if (ms <= 0) return "0h 0m";
  const mTotal = Math.floor(ms / 60000);
  const h = Math.floor(mTotal / 60);
  const m = mTotal % 60;
  return `${h}h ${m}m`;
}

export default function Results() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  // ---- state ----
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [rows, setRows] = useState([]); // poll_results rows: { poll_id, option, points }

  // inject 3D spin keyframes + crown styles (once)
  useEffect(() => {
    const css = `
      /* 3D crown spinner */
      .crown3d {
        width: 28px;
        height: 28px;
        position: relative;
        perspective: 700px;
        display: inline-block;
        margin-left: 4px;
        filter: drop-shadow(0 0 6px rgba(255,140,0,.9));
        vertical-align: middle;
      }
      .crown3d .scene {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        animation: crown-rotateY 1.15s linear infinite;
      }
      .crown3d .face {
        position: absolute;
        inset: 0;
        backface-visibility: hidden;
        transform-style: preserve-3d;
      }
      .crown3d .front {
        transform: translateZ(0.01px) rotateY(0deg);
        filter: brightness(1) saturate(1.05);
      }
      .crown3d .back {
        transform: rotateY(180deg) translateZ(0.01px);
        filter: brightness(0.78) saturate(0.95);
      }

      /* subtle “thickness” illusion with a rim */
      .crown3d .rim {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 6px;
        box-shadow:
          0 0 0 1px rgba(255,140,0,0.55) inset,
          0 0 12px rgba(255,140,0,0.35) inset;
        pointer-events: none;
        transform: translateZ(-0.5px);
      }

      @keyframes crown-rotateY {
        0%   { transform: rotateY(0deg)   rotateZ(0deg); }
        50%  { transform: rotateY(180deg) rotateZ(0.6deg); } /* tiny tilt adds depth */
        100% { transform: rotateY(360deg) rotateZ(0deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .crown3d .scene { animation: none !important; }
      }
    `;
    let tag = document.getElementById("crown-3d-css");
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "crown-3d-css";
      tag.textContent = css;
      document.head.appendChild(tag);
    }
  }, []);

  // fetch poll by code
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

  // compute totals, sort, ranks, ties
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
    arr.sort(
      (a, b) => b.points - a.points || a.option.localeCompare(b.option)
    );
    // assign ranks with ties sharing same rank number
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

  // ballots count = total points / sum(weights)
  const ballotsCount = useMemo(() => {
    const S = weights.reduce((a, b) => a + b, 0);
    if (!S) return 0;
    const totalPoints = totals.reduce((a, r) => a + r.points, 0);
    return Math.round(totalPoints / S);
  }, [weights, totals]);

  const timeLeft = Math.max(
    0,
    (poll ? new Date(poll.closes_at).getTime() : 0) - now
  );

  // ---- render ----
  if (loading) {
    return ScreenWrap(
      <div style={styles.container}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={styles.text}>Loading…</p>
      </div>
    );
  }
  if (!poll) {
    return ScreenWrap(
      <div style={styles.container}>
        <h1 style={styles.title}>Room {code}</h1>
        <p style={styles.text}>
          We couldn’t find this poll. Double-check the code.
        </p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>
          Home
        </button>
      </div>
    );
  }
  if (status === "expired") {
    return ScreenWrap(
      <div style={styles.container}>
        <h1 style={styles.title}>{poll.title}</h1>
        <p style={{ ...styles.text, marginTop: 8 }}>
          This page has gone the way of your New Year’s resolutions.
        </p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>
          Home
        </button>
      </div>
    );
  }

  return ScreenWrap(
    <div style={styles.container}>
      {/* Banners */}
      {state?.tooSlow && (
        <Banner text="Too slow — voting’s over, but here are the results." />
      )}
      {state?.thanks && (
        <Banner text="Thanks for voting! You’re viewing live results." />
      )}

      {/* Header */}
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

      {/* Results list */}
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {totals.map((row) => (
          <div
            key={row.option}
            style={{
              ...styles.resultRow,
              ...(row.rank === 1 ? styles.firstPlace : {}),
            }}
          >
            <div style={styles.rankCell}>
              <span style={styles.rankNum}>{row.rank}</span>
              {row.rank === 1 && <Crown3D />}
              {row.tie && <span style={styles.tieBadge}>TIE</span>}
            </div>
            <div style={styles.optionCell}>{row.option}</div>
            <div style={styles.pointsCell}>{row.points} pts</div>
          </div>
        ))}
      </div>

      <div style={styles.actionsRow}>
        <button
          style={styles.secondaryBtn}
          onClick={() => nav(`/room/${code}`)}
        >
          Back to Room
        </button>
        <button style={styles.linkBtn} onClick={() => nav("/")}>
          Home
        </button>
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

/** A small inline-SVG crown with front/back faces for a 3D spin illusion */
function Crown3D() {
  return (
    <span className="crown3d" aria-hidden>
      <span className="scene">
        {/* FRONT FACE */}
        <span className="face front">
          <CrownSVG />
        </span>

        {/* BACK FACE (slightly darker) */}
        <span className="face back">
          <CrownSVG />
        </span>

        {/* Rim overlay for “thickness” */}
        <span className="rim" />
      </span>
    </span>
  );
}

/** SVG crown icon (pure inline, no external asset) */
function CrownSVG() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD678" />
          <stop offset="50%" stopColor="#FFB347" />
          <stop offset="100%" stopColor="#FF8C00" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* base shape */}
      <path
        d="M8 46 L16 18 L32 34 L48 18 L56 46 Z"
        fill="url(#gold)"
        stroke="#DB7600"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* bottom bar */}
      <rect x="10" y="44" width="44" height="8" rx="4" fill="#FF9A2E" stroke="#DB7600" strokeWidth="2" />
      {/* orbs */}
      <circle cx="16" cy="18" r="3.5" fill="#FFE9B8" stroke="#DB7600" strokeWidth="1" />
      <circle cx="48" cy="18" r="3.5" fill="#FFE9B8" stroke="#DB7600" strokeWidth="1" />
      <circle cx="32" cy="34" r="3.5" fill="#FFE9B8" stroke="#DB7600" strokeWidth="1" />

      {/* gentle shine */}
      <path
        d="M12 28 C20 22, 44 22, 52 28"
        stroke="url(#shine)"
        strokeWidth="3"
        fill="none"
        opacity="0.9"
      />
    </svg>
  );
}

const styles = {
  // mobile-safe outer wrap
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
    overflowX: "hidden",
  },

  // container (card)
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

  // header
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

  // sub badges
  subRow: {
    marginTop: 8,
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

  // result rows
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
  firstPlace: { borderColor: ORANGE, boxShadow: "0 0 14px rgba(255,140,0,.45)" },
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
  pointsCell: {
    marginLeft: "auto",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    flex: "0 0 auto",
  },

  // actions
  actionsRow: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
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

  // misc
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
