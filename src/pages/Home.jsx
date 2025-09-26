// src/pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ⬇️ Match filename/case exactly (e.g., TheSecretVote.png)
import logo from "../assets/TheSecretVote.png";

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  function goCreate() {
    nav("/create");
  }

  function goCreateCollect() {
    nav("/create-collect");
  }

  // Route by code
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
      <img src={logo} alt="The Secret Vote" style={styles.logoImg} loading="eager" />

      {/* STACKED: Code Entry (top) → Create Poll → Create Group Idea */}
      <div style={styles.cardsColumn}>
        {/* 1) Join with code */}
        <div style={styles.cardJoin} aria-label="Join with a code">
          <div style={styles.entryLabel}>Have a code? Jump in:</div>

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
            <button type="submit" style={styles.secondaryBtn} disabled={loading}>
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
  wrap: {
    minHeight: "100svh", // better on mobile Safari
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingTop: "max(18px, env(safe-area-inset-top))",
    paddingBottom: "max(18px, env(safe-area-inset-bottom))",
    background: "#0b0f17",
    color: "#e9e9f1",
  },

  // Title image — scales down on small screens
  logoImg: {
    width: "min(420px, 78vw)",
    height: "auto",
    display: "block",
    borderRadius: 16,
    boxShadow: "0 0 16px rgba(255,140,0,.35)",
    marginBottom: 22, // a hair tighter for phones
    filter: "drop-shadow(0 0 10px rgba(255,140,0,.35))",
  },

  // Single column for three cards (mobile-first width)
  cardsColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    width: "min(520px, 94vw)", // fits iPhone without horizontal scroll
  },

  // Base card appearance
  cardBase: {
    width: "100%",
    maxWidth: "min(520px, 94vw)",
    padding: 14,
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },

  // Action cards
  cardAction: {
    width: "100%",
    maxWidth: "min(520px, 94vw)",
    padding: 14,
    borderRadius: 16,
    background: "rg
