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
      <h1 style={styles.title}>The Secret Vote</h1>

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

      <p style={styles.hint}>Scan the QR or type the code to join a poll.</p>
    </div>
  );
}

const styles = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0f17", color: "#e9e9f1" },
  title: { fontSize: 36, letterSpacing: 1, textShadow: "0 0 12px rgba(255,140,0,.8)" }, // neon orange glow
  card: { padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.04)", boxShadow: "0 0 20px rgba(255,140,0,.35)" },
  row: { display: "flex", gap: 8, marginTop: 12 },
  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    width: 200,
    letterSpacing: 2,
    textTransform: "uppercase",
    outline: "none",
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
  },
  secondaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #ff8c00",
    background: "transparent",
    color: "#ff8c00",
    cursor: "pointer",
  },
  hint: { opacity: 0.7, marginTop: 12, fontSize: 12 },
};
