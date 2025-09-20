import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function CreateCollect() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("120"); // minutes: 30, 120, 1440
  const [busy, setBusy] = useState(false);

  async function createRoom() {
    const t = title.trim();
    if (!t) return alert("Please enter a question / poll title.");
    if (t.length > 60) return alert("Title must be 60 characters or fewer.");

    setBusy(true);
    try {
      // try a few times in case of code collision
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();
        const { error } = await supabase.from("collect_polls").insert({
          code,
          title: t,
          vote_duration_minutes: parseInt(duration, 10),
          created_at: new Date().toISOString(),
        });

        if (!error) {
          nav(`/collect/${code}`);
          return;
        }
        // 23505 = unique_violation (code collision). Otherwise, fail fast.
        if (error.code !== "23505") {
          console.error(error);
          alert("Could not create room.");
          return;
        }
      }
      alert("Could not allocate a room code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h1 style={s.title}>Collect Options First</h1>

        <label style={s.label}>Poll Title</label>
        <input
          style={s.input}
          maxLength={60}
          placeholder="What should we do?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label style={{ ...s.label, marginTop: 14 }}>
          Voting Duration (after collection)
        </label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          style={s.select}
        >
          <option value="30">30 minutes</option>
          <option value="120">2 hours</option>
          <option value="1440">24 hours</option>
        </select>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            style={{ ...s.primaryBtn, opacity: busy ? 0.6 : 1 }}
            disabled={busy}
            onClick={createRoom}
          >
            Create Collection Room
          </button>
          <button style={s.secondaryBtn} onClick={() => nav("/")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    fontSize: "clamp(22px, 4.5vw, 28px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
  },
  label: { display: "block", marginTop: 8, marginBottom: 6, fontWeight: 700 },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: 240,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
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
};
