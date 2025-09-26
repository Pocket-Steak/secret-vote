import { useState } from "react";

// PREVIEW-ONLY: Standalone component to visualize layout without router/supabase.
export default function HomePreview() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const ORANGE = "#ff8c00";

  const styles = {
    wrap: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      paddingTop: 24,
      paddingBottom: 32,
      background: "#0b0f17",
      color: "#e9e9f1",
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    },

    // Simple logo placeholder for preview
    logo: {
      width: "min(380px, 70vw)",
      height: 80,
      marginBottom: 8,
      display: "grid",
      placeItems: "center",
      borderRadius: 16,
      background: "linear-gradient(135deg, rgba(255,140,0,.25), rgba(255,255,255,.05))",
      boxShadow: "0 0 16px rgba(255,140,0,.35)",
      color: "#ffd9b3",
      fontWeight: 800,
      letterSpacing: 0.4,
      textShadow: "0 0 10px rgba(255,140,0,.35)",
    },

    cardsRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 16,
      justifyContent: "center",
      width: "min(1040px, 96vw)",
    },

    cardAction: {
      padding: 16,
      borderRadius: 16,
      background: "rgba(255,255,255,0.04)",
      boxShadow: "0 0 20px rgba(255,140,0,.25)",
      flex: "1 1 320px",
      maxWidth: 340,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      transition: "transform .15s ease, box-shadow .15s ease",
    },

    cardJoin: {
      padding: 16,
      borderRadius: 16,
      background: "rgba(255,255,255,0.06)",
      boxShadow: "0 0 24px rgba(255,140,0,.35)",
      flex: "1 1 360px",
      maxWidth: 380,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },

    cardTitle: {
      fontSize: 18,
      fontWeight: 800,
      letterSpacing: 0.3,
      color: "#ffd9b3",
      textShadow: "0 0 10px rgba(255,140,0,.35)",
    },

    cardText: { opacity: 0.85, lineHeight: 1.35, fontSize: 14 },

    entryLabel: {
      marginTop: 2,
      marginBottom: 2,
      fontWeight: 700,
      fontSize: 14,
      color: "#ffd9b3",
      textShadow: "0 0 8px rgba(255,140,0,.35)",
      textAlign: "center",
    },

    row: { display: "flex", gap: 8, justifyContent: "center" },

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
      textAlign: "center",
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

    hint: { opacity: 0.7, fontSize: 12, marginTop: 10 },
    hintCenter: { opacity: 0.8, fontSize: 12, textAlign: "center" },
  };

  function clickDemoCreate() {
    alert("Preview: Create a Poll");
  }
  function clickDemoCollect() {
    alert("Preview: Create a Group Idea Poll");
  }
  function goToRoomDemo(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert(`Preview: would route using code "${code.trim().toUpperCase()}"`);
    }, 450);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.logo}>The Secret Vote (Preview)</div>

      <div style={styles.cardsRow}>
        {/* Left: Create a Poll */}
        <div style={styles.cardAction}>
          <div style={styles.cardTitle}>Create a Poll</div>
          <p style={styles.cardText}>
            Make a quick, secret vote. Share the code, everyone joins and votes.
          </p>
          <button style={styles.primaryBtn} onClick={clickDemoCreate}>
            Create a Poll
          </button>
        </div>

        {/* Center: Code Entry */}
        <div style={styles.cardJoin} aria-label="Join with a code">
          <div style={styles.entryLabel}>Have a code? Jump in:</div>
          <form onSubmit={goToRoomDemo} style={styles.row}>
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
          <div style={styles.hintCenter}>
            Codes work for both collection and voting rooms.
          </div>
        </div>

        {/* Right: Create a Group Idea Poll */}
        <div style={styles.cardAction}>
          <div style={styles.cardTitle}>Create a Group Idea Poll</div>
          <p style={styles.cardText}>
            Collect options from the group first, then open voting when ready.
          </p>
          <button style={styles.outlineBtn} onClick={clickDemoCollect}>
            Create a Group Idea Poll
          </button>
        </div>
      </div>

      <p style={styles.hint}>Tip: Share your code anywhere—QR, text, or link.</p>
    </div>
  );
}
