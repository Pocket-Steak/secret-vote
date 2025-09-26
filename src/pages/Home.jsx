// src/pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Title image from /public (works on GitHub Pages subpaths)
  const logoSrc = `${import.meta.env.BASE_URL}TheSecretVote.png`;

  function goCreate() {
    nav("/create");
  }
  function goCreateCollect() {
    nav("/create-collect");
  }

  // Route by code:
  // 1) collect_polls -> /collect/:code
  // 2) polls -> /vote/:code
  async function goToRoom(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) {
      alert("Enter a 6-character code (letters/numbers).");
      return;
    }

    setLoading(true);
    try {
      const { data: collect, error: ce } = await supabase
        .from("collect_polls")
        .select("code")
        .eq("code", c)
        .maybeSingle();
      if (ce) console.error("collect lookup error", ce);
      if (collect) {
        nav(`/collect/${c}`);
        return;
      }

      const { data: poll, error: pe } = await supabase
        .from("polls")
        .select("code")
        .eq("code", c)
        .maybeSingle();
      if (pe) console.error("poll lookup error", pe);
      if (poll) {
        nav(`/vote/${c}`);
        return;
      }

      alert(`We couldn’t find a room with code “${c}”.`);
    } catch (err) {
      console.error(err);
      alert("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      {/* Title image */}
      <img src={logoSrc} alt="The Secret Vote" style={styles.logoImg} loading="eager" />

      {/* STACKED: Code Entry (top) → Create Poll → Create Group Idea */}
      <div style={styles.column}>
        {/* 1) Join with code */}
        <div style={styles.cardJoin} aria-label="Join with a code">
          <div style={styles.entryLabel}>Have a code? Jump in:</div>

          {/* On phones, these stack vertically for comfort */}
          <form onSubmit={goToRoom} style={styles.row}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ENTER 6-CHAR CODE"
              maxLength={6}
              style={styles.input}
              aria-label="Enter 6-character room code"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
            />
            <button type="submit" style={styles.goBtn} disabled={loading}>
              {loading ? "Checking…" : "Go"}
            </button>
          </form>

          <div style={styles.hintCenter}>
            Codes work for both collection and voting rooms.
          </div>
        </div>

        {/* 2) Create a Poll */}
        <div style={styles.cardAction}>
          <div style={styles.cardTitle}>Create a Poll</div>
          <p style={styles.cardText}>
            Make a quick, secret vote. Share the code, everyone joins and votes.
          </p>
          <button style={styles.primaryBtn} onClick={goCreate}>
            Create a Poll
          </button>
        </div>

        {/* 3) Create a Group Idea Poll */}
        <div style={styles.cardAction}>
          <div style={styles.cardTitle}>Create a Group Idea Poll</div>
          <p style={styles.cardText}>
            Collect options from the group first, then open voting when ready.
          </p>
          <button style={styles.outlineBtn} onClick={goCreateCollect}>
            Create a Group Idea Poll
          </button>
        </div>
      </div>

      <p style={styles.hint}>Tip: Share your code anywhere—QR, text, or link.</p>
    </div>
  );
}

const ORANGE = "#ff8c00";

const styles = {
  // iPhone-friendly viewport with safe-area insets
  wrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingTop: "max(16px, env(safe-area-inset-top))",
    paddingBottom: "max(16px, env(safe-area-inset-bottom))",
    background: "#0b0f17",
    color: "#e9e9f1",
  },

  // Title image scaled for narrow screens
  logoImg: {
    width: "min(360px, 86vw)",
    height: "auto",
    display: "block",
    borderRadius: 14,
    boxShadow: "0 0 12px rgba(255,140,0,.3)",
    marginBottom: 16,
    filter: "drop-shadow(0 0 8px rgba(255,140,0,.28))",
  },

  // Narrow single column so nothing feels cramped
  column: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    width: "min(440px, 92vw)", // tighter than before → better on iPhone
  },

  baseCard: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },

  // Highlighted Join card
  cardJoin: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 0 14px rgba(255,140,0,.28)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  // Action cards
  cardAction: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 12px rgba(255,140,0,.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.3,
    color: "#ffd9b3",
    textShadow: "0 0 8px rgba(255,140,0,.3)",
  },

  cardText: { opacity: 0.88, lineHeight: 1.38, fontSize: 14 },

  entryLabel: {
    marginTop: 2,
    marginBottom: 2,
    fontWeight: 700,
    fontSize: 14,
    color: "#ffd9b3",
    textShadow: "0 0 6px rgba(255,140,0,.28)",
    textAlign: "center",
  },

  // Stack input and Go vertically → zero cramping
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  input: {
    width: "100%",
    padding: "14px 16px",
    minHeight: 46,               // iOS tap target
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    letterSpacing: 2,
    textTransform: "uppercase",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
  },

  goBtn: {
    padding: "12px 16px",
    minHeight: 46,
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    fontWeight: 800,
    cursor: "pointer",
    width: "100%",               // full-width button under input
    boxSizing: "border-box",
  },

  primaryBtn: {
    padding: "14px 16px",
    minHeight: 46,
    borderRadius: 12,
    border: "none",
    background: ORANGE,
    color: "#080000ff",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 0 8px rgba(255,140,0,.5)",
  },

  outlineBtn: {
    padding: "14px 16px",
    minHeight: 46,
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    fontWeight: 800,
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
  },

  hintCenter: { opacity: 0.85, fontSize: 12, textAlign: "center" },
  hint: { opacity: 0.75, fontSize: 12, marginTop: 10 },
};
