import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

// minutes-only time
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

  // ---- state (hooks must stay in same order) ----
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [rows, setRows] = useState([]); // poll_results rows: { poll_id, option, points }

  // sound
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef(null);
  const lastLeaderRef = useRef(null);
  const playedOnceRef = useRef(false);

  // prepare audio
  useEffect(() => {
    const src = `${import.meta.env.BASE_URL}win.wav`; // place win.wav in /public
    const a = new Audio(src);
    a.volume = 0.6;
    audioRef.current = a;
    return () => {
      try { a.pause(); a.src = ""; } catch {}
    };
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
    return () => { cancelled = true; };
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
    return () => { cancelled = true; clearInterval(t); };
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
    const arr = Array.from(map.entries()).map(([option, points]) => ({ option, points }));
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

  // ballots count from points / ballot-sum
  const ballotsCount = useMemo(() => {
    const S = weights.reduce((a, b) => a + b, 0);
    if (!S) return 0;
    const totalPoints = totals.reduce((a, r) => a + r.points, 0);
    return Math.round(totalPoints / S);
  }, [weights, totals]);

  const timeLeft = Math.max(0, (poll ? new Date(poll.closes_at).getTime() : 0) - now);

  // --- play win sound on first show & whenever leader changes ---
  useEffect(() => {
    if (!totals.length) return;
    const leaderKey = `${totals[0].option}|${totals[0].points}`;

    // play once when results first appear
    if (!playedOnceRef.current) {
      playedOnceRef.current = true;
      if (soundOn && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {/* autoplay might be blocked */});
      }
    } else if (lastLeaderRef.current && lastLeaderRef.current !== leaderKey) {
      // leader changed -> play again
      if (soundOn && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }

    lastLeaderRef.current = leaderKey;
  }, [totals, soundOn]);

  // ---- render branches (no hooks below this point) ----
  if (loading) {
    return ScreenWrap(
      <>
        <StyleTag />
        <div style={styles.container}>
          <h1 style={styles.title}>Room {code}</h1>
          <p style={styles.text}>Loading…</p>
        </div>
      </>
    );
  }
  if (!poll) {
    return ScreenWrap(
      <>
        <StyleTag />
        <div style={styles.container}>
          <h1 style={styles.title}>Room {code}</h1>
          <p style={styles.text}>We couldn’t find this poll. Double-check the code.</p>
          <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
        </div>
      </>
    );
  }
  if (status === "expired") {
    return ScreenWrap(
      <>
        <StyleTag />
        <div style={styles.container}>
          <h1 style={styles.title}>{poll.title}</h1>
          <p style={{ ...styles.text, marginTop: 8 }}>
            This page has gone the way of your New Year’s resolutions.
          </p>
          <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
        </div>
      </>
    );
  }

  return ScreenWrap(
    <>
      <StyleTag />
      <div style={styles.container}>
        {state?.tooSlow && <Banner text="Too slow — voting’s over, but here are the results." />}
        {state?.thanks && <Banner text="Thanks for voting! You’re viewing live results." />}

        {/* Header */}
        <div style={styles.headerRow}>
          <h1 style={styles.title}>{poll.title}</h1>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={styles.soundBtn}
              onClick={() => setSoundOn((v) => !v)}
              title={soundOn ? "Mute sound" : "Unmute sound"}
            >
              {soundOn ? "🔊" : "🔈"}
            </button>
            <div style={styles.timer}>
              {status === "open" ? <>Ends in {fmtHM(timeLeft)}</> : <>Voting Closed</>}
            </div>
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
              className={row.rank === 1 ? "pulseGlow" : undefined}
            >
              <div style={styles.rankCell}>
                <span style={styles.rankNum}>{row.rank}</span>
                {row.rank === 1 && <span style={styles.crown} className="spin">👑</span>}
                {row.tie && <span style={styles.tieBadge}>TIE</span>}
              </div>
              <div style={styles.optionCell}>{row.option}</div>
              <div style={styles.pointsCell}>{row.points} pts</div>
            </div>
          ))}
        </div>

        <div style={styles.actionsRow}>
          <button style={styles.secondaryBtn} onClick={() => nav(`/room/${code}`)}>Back to Room</button>
          <button style={styles.linkBtn} onClick={() => nav("/")}>Home</button>
        </div>
      </div>
    </>
  );
}

/* ---------- helpers / styles ---------- */
function Banner({ text }) {
  return <div style={styles.banner}>{text}</div>;
}
function ScreenWrap(children) {
  return <div style={styles.wrap}>{children}</div>;
}

/** Scoped animations */
function StyleTag() {
  return (
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      .spin {
        display: inline-block;
        animation: spin 1.2s linear infinite;
        filter: drop-shadow(0 0 6px rgba(255,140,0,.9));
      }

      @keyframes pulseGlow {
        0%   { box-shadow: 0 0 10px rgba(255,140,0,.35); }
        50%  { box-shadow: 0 0 22px rgba(255,140,0,.75); }
        100% { box-shadow: 0 0 10px rgba(255,140,0,.35); }
      }
      .pulseGlow {
        animation: pulseGlow 1.6s ease-in-out infinite;
      }
    `}</style>
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
  firstPlace: { borderColor: ORANGE }, // pulse handled by class
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
  crown: { marginLeft: 2 },
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

  soundBtn: {
    border: "1px solid #333",
    background: "transparent",
    color: "#ffd9b3",
    borderRadius: 10,
    padding: "6px 10px",
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
