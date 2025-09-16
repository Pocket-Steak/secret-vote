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

  // Works for dev + GitHub Pages
  const logoSrc = `${import.meta.env.BASE_URL}TheSecretVote.png`;

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>
        {/* Logo image instead of title */}
        <img
          src={logoSrc}
          alt="The Secret Vote"
          style={styles.logo}
          draggable={false}
        />

        <div style={styles.card}>
          <button style={styles.primaryBtn} onClick={goCreate}>
            Create Poll
          </button>

          {/* The row uses a responsive grid so it stacks on phones */}
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

        <p style={styles.hint}>Type the room code to join a poll.</p>
      </div>
    </div>
  );
}

const styles = {
  // Same outer container pattern as other pages (prevents right-edge overflow on iPhone)
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "18px 12px",
    boxSizing: "border-box",
  },

  // Inner width clamps exactly like Create/Results
  container: {
    width: "min(720px, 92vw)",
    display: "grid",
    justifyItems: "center",
    gap: 12,
  },

  // Responsive logo — never exceeds container, no overflow
  logo: {
    width: "min(520px, 86vw)",
    height: "auto",
    marginBottom: 8,
    filter: "drop-shadow(0 0 12px rgba(255,140,0,.6))",
    userSelect: "none",
  },

  card: {
    width: "100%",
    padding: 24,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
  },

  // Grid that becomes two columns on wider screens and stacks on phones
  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    marginTop: 12,
  },

  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    letterSpacing: 2,
    textTransform: "uppercase",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    minWidth: 0, // prevents grid overflow on iOS
  },

  primaryBtn: {
    padding: "12px 18px",
    borderRadius: 12,
    border: "none",
    marginBottom: 12,
    background: "#ff8c00",
    color: "#080000ff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 0 14px rgba(255,140,0,.8)",
    width: "100%", // full width on phones
  },

  secondaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #ff8c00",
    background: "transparent",
    color: "#ff8c00",
    cursor: "pointer",
    width: "100%", // stacks nicely on small screens
  },

  hint: { opacity: 0.7, marginTop: 10, fontSize: 12, textAlign: "center" },
};
