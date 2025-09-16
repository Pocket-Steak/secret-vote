import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

// shuffle helper (Fisher–Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// format H:M (no seconds)
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

  // ---- state ----
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [optionsOrder, setOptionsOrder] = useState([]); // randomized once per voter
  const [ranks, setRanks] = useState([]);               // best -> worst (strings or null)
  const [activeRank, setActiveRank] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [redirectIn, setRedirectIn] = useState(5);

  // ---- load poll from Supabase ----
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
          if (data?.options) {
            const shuf = shuffle(data.options);
            setOptionsOrder(shuf);
            setRanks(Array(data.options.length).fill(null));
            setActiveRank(0);
          }
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  // tick (minutes-only)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // status
  const status = useMemo(() => {
    if (!poll) return "missing";
    const closes = new Date(poll.closes_at).getTime();
    const expires = new Date(poll.expires_at).getTime();
    if (now >= expires) return "expired";
    if (now >= closes) return "closed";
    return "open";
  }, [poll, now]);

  // if closed while on page → redirect to results (discard incomplete ballot)
  useEffect(() => {
    if (status === "closed") {
      nav(`/results/${code}`, { state: { tooSlow: true } });
    }
  }, [status, nav, code]);

  // computed
  const N = poll?.options?.length ?? 0;
  const assigned = new Set(ranks.filter(Boolean));
  const available = optionsOrder.filter((o) => !assigned.has(o));
  const timeLeft = poll ? Math.max(0, new Date(poll.closes_at).getTime() - now) : 0;

  // interactions
  function chooseOption(opt) {
    setRanks((r) => {
      if (activeRank >= r.length) return r;
      const next = [...r];
      next[activeRank] = opt;
      const nextIdx = next.findIndex((x) => x === null);
      setActiveRank(nextIdx === -1 ? r.length - 1 : nextIdx);
      return next;
    });
  }
  function clearRank(i) {
    setRanks((r) => {
      const next = [...r];
      next[i] = null;
      setActiveRank(i);
      return next;
    });
  }

  // submit → insert into Supabase
  async function submitVote() {
    if (!poll) return;
    if (ranks.some((x) => x === null)) {
      alert("Please complete all ranks before submitting.");
      return;
    }
    const { error } = await supabase.from("votes").insert({
      poll_id: poll.id,
      ranks, // array of option strings, best->worst
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error(error);
      alert("Could not submit your vote. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  // thank-you auto-redirect
  useEffect(() => {
    if (!submitted) return;
    setRedirectIn(5);
    const t = setInterval(() => {
      setRedirectIn((x) => {
        if (x <= 1) {
          clearInterval(t);
          nav(`/results/${code}`, { state: { thanks: true } });
          return 0;
        }
        return x - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted, nav, code]);

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
        <p style={styles.text}>We couldn’t find this poll. Double-check the code.</p>
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
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
        <button style={styles.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }
  if (submitted) {
    return ScreenWrap(
      <div style={styles.container}>
        <h1 style={styles.title}>Thanks for voting in “{poll.title}”</h1>
        <p style={styles.text}>Sending you to the live results… ({redirectIn}s)</p>
        <div style={{ marginTop: 12 }}>
          <button style={styles.primaryBtn} onClick={() => nav(`/results/${code}`)}>
            Skip to Results
          </button>
        </div>
      </div>
    );
  }

  return ScreenWrap(
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>{poll.title}</h1>
        <div style={styles.timer}>Ends in {fmtHM(timeLeft)}</div>
      </div>

      {/* Rank slots */}
      <div style={styles.rankWrap}>
        {ranks.map((val, i) => {
          const isActive = i === activeRank;
          const filled = val !== null;
          return (
            <div
              key={i}
              style={{
                ...styles.rankRow,
                ...(isActive ? styles.rankActive : {}),
                ...(filled ? styles.rankFilled : {}),
              }}
              onClick={() => setActiveRank(i)}
              title={
                filled
                  ? "Click to make this slot active (you can clear it)"
                  : "Click to fill this slot"
              }
            >
              <div style={styles.rankBadge}>{i + 1}</div>
              <div style={styles.rankContent}>
                {filled ? (
                  <div style={styles.choiceChipLocked}>
                    <span>{val}</span>
                    <button
                      style={styles.clearBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearRank(i);
                      }}
                      title="Clear this rank"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span style={{ opacity: 0.6 }}>Pick option for rank #{i + 1}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Available options */}
      <div style={{ marginTop: 16 }}>
        <div style={styles.grid}>
          {available.map((opt) => (
            <button
              key={opt}
              style={{ ...styles.choiceChip, ...(activeRank < N ? styles.glow : {}) }}
              onClick={() => chooseOption(opt)}
              title={`Set as #${activeRank + 1}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actionsRow}>
        <button style={styles.secondaryBtn} onClick={() => nav(`/room/${code}`)}>Back</button>
        <button
          style={{ ...styles.primaryBtn, opacity: ranks.some((x) => x === null) ? 0.6 : 1 }}
          disabled={ranks.some((x) => x === null)}
          onClick={submitVote}
          title={ranks.some((x) => x === null) ? "Complete all ranks" : "Submit your vote"}
        >
          Submit Vote
        </button>
      </div>
    </div>
  );
}

/* ---------- layout & styles (phone-friendly only) ---------- */
function ScreenWrap(children) {
  return <div style={styles.wrap}>{children}</div>;
}

const styles = {
  // outer shell
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
    overflowX: "hidden",
  },
  // card/container
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

  rankWrap: { display: "grid", gap: 10, marginTop: 16 },
  rankRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #222",
    cursor: "pointer",
    flexWrap: "wrap",
  },
  rankActive: { boxShadow: "0 0 12px rgba(255,140,0,.5)", borderColor: ORANGE },
  rankFilled: { background: "rgba(255,255,255,0.05)" },

  rankBadge: {
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    border: `1px solid ${ORANGE}`,
    color: ORANGE,
    fontWeight: 800,
    flex: "0 0 auto",
  },
  rankContent: { flex: "1 1 200px", minWidth: 0 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
  },
  choiceChip: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    cursor: "pointer",
    transition: "transform .08s ease, box-shadow .08s ease",
    textAlign: "center",
  },
  glow: { boxShadow: "0 0 16px rgba(255,140,0,.55)", borderColor: ORANGE },

  choiceChipLocked: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 999,
    background: "#181f33",
    border: `1px solid ${ORANGE}`,
    boxShadow: "0 0 10px rgba(255,140,0,.45)",
  },
  clearBtn: {
    border: "1px solid #333",
    background: "transparent",
    color: "#bbb",
    borderRadius: 8,
    padding: "2px 6px",
    cursor: "pointer",
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

  actionsRow: {
    display: "flex",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  },

  text: { opacity: 0.9 },
};
