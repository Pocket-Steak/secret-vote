// src/pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Use Vite's base URL so the image works on GitHub Pages (/secret-vote/)
  const logoSrc = `${import.meta.env.BASE_URL}TheSecretVote.png`;

  function goCreate() {
    nav("/create");
  }

  // Go to the "collect options first" flow
  function goCreateCollect() {
    nav("/create-collect");
  }

  // NEW: Auto-detect the destination from the code:
  // 1) If code exists in collect_polls -> /collect/:code
  // 2) Else if code exists in polls -> /vote/:code
  // 3) Else show an alert
  async function goToRoom(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) {
      alert("Enter a 6-character code (letters/numbers).");
      return;
    }

    setLoading(true);
    try {
      // Try collection rooms first
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

      // Try standard polls for voting
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
      <img
        src={logoSrc}
        alt="The Secret Vote"
        style={styles.logo}
        loading="eager"
      />

      <div style={styles.card}>
        {/* Code entry at the top */}
        <div style={styles.entryLabel}>Have a code? Enter it to jump in:</div>
        <form onSubmit={goToRoom} style={styles.row}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ENTER 6-CHAR CODE"
            maxLength={6}
            style={styles.input}
            aria-label="Enter 6-character room code"
          />
          <button type="submit" style={styles.secondaryBtn} disabled={loading}>
            {loading ? "Checking…" : "Go"}
          </button>
        </form>

        {/* Actions underneath */}
        <button style={styles.primaryBtn} onClick={goCreate}>
          Create a Poll
        </button>

        <button style={styles.outlineBtn} onClick={goCreateCollect}>
          Create a Group Idea Poll
        </button>
      </div>

      <p style={styles.hint}>Codes work for both collection and voting rooms.</p>
    </div>
  );
}

const ORANGE = "#ff8c00";

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingTop: 24,
    background: "#0b0f17",
    color: "#e9e9f1",
  },

  logo: {
    width: "min(380px, 70vw)",
    height: "auto",
    filter: "drop-shadow(0 0 12px rgba(255,140,0,.6))",
    marginBottom: 8,
  },

  card: {
    padding: 16,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    width: "min(420px, 92vw)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  entryLabel: {
    marginTop: 2,
    marginBottom: 2,
    fontWeight: 700,
    fontSize: 14,
    color: "#ffd9b3",
    textShadow: "0 0 8px rgba(255,140,0,.35)",
  },

  row: { display: "flex", gap: 8 },

  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    width: "100%",
    maxWidth: 220,
    letterSpacing: 2,
    textTransform: "uppercase",
    outline: "none",
    boxSizing: "border-box",
  },

  primaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: ORANGE,
    color: "#080000ff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 0 12px rgba(255,140,0,.75)",
  },

  outlineBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
  },

  secondaryBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  hint: { opacity: 0.7, fontSize: 12, marginTop: 6 },
};
