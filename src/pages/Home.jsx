import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");

  function goCreate() {
    nav("/create");
  }

  function goToRoom(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) return alert("Enter a 6-character code (letters/numbers).");
    nav(`/room/${c}`);
  }

  return (
    <div style={styles.wrap}>
      {/* Logo closer to the top */}
      <img
        src="/TheSecretVote.png"
        alt="The Secret Vote"
        style={styles.logo}
        loading="eager"
      />

      <div style={styles.card}>
        <button style={styles.primaryBtn} onClick={goCreate}>
          Create Poll
        </button>

        <form onSubmit={goToRoom} style={styles.row}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-char code"
            maxLength={6}
            style={styles.input}
          />
          <button type="submit" style={styles.secondaryBtn}>Go</button>
        </form>
      </div>

      <p style={styles.hint}>Type the code to join a poll.</p>
    </div>
  );
}

const ORANGE = "#ff8c00";

const styles = {
  // Move content toward the top: use flex column + small padding
  wrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,                 // tighter overall spacing
    paddingTop: 24,          // small top padding so logo isn’t glued to the edge
    background: "#0b0f17",
    color: "#e9e9f1",
  },

  // Responsive logo with subtle glow; sits closer to the top
  logo: {
    width: "min(380px, 70vw)",  // scales down on phones
    height: "auto",
    filter: "drop-shadow(0 0 12px rgba(255,140,0,.6))",
    marginBottom: 8,            // small gap to the card
  },

  // Slightly tighter card
  card: {
    padding: 16,                 // was 24
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    width: "min(420px, 92vw)",   // keeps it narrow on mobile
    display: "flex",
    flexDirection: "column",
    gap: 10,                     // tighter spacing inside
  },

  row: {
    display: "flex",
    gap: 8,
  },

  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    width: "100%",
    maxWidth: 220,               // keep form compact
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
