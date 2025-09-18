import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");

  // Use Vite's base URL so the image works on GitHub Pages (/secret-vote/)
  const logoSrc = `${import.meta.env.BASE_URL}TheSecretVote.png`;

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
      <img
        src={logoSrc}
        alt="The Secret Vote"
        style={styles.logo}
        loading="eager"
      />

      <div style={styles.card}>
        <button style={styles.primaryBtn} onClick={goCreate}>
          Create Poll
        </button>

        {/* New: label above the code entry */}
        <div style={styles.entryLabel}>Have a code? Enter it below to cast your vote:</div>

        <form onSubmit={goToRoom} style={styles.row}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ENTER 6-CHAR CODE"
            maxLength={6}
            style={styles.input}
            aria-label="Enter 6-character room code"
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

  // New: label styling
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
