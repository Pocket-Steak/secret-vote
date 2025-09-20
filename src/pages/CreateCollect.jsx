import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CreateCollect() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("120"); // minutes after collection
  const [limit, setLimit] = useState(3);           // NEW: max options per participant
  const [busy, setBusy] = useState(false);

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function createRoom() {
    const t = title.trim();
    if (!t) return alert("Please enter a title.");
    const limitInt = Number(limit);
    if (!Number.isInteger(limitInt) || limitInt < 1 || limitInt > 10) {
      return alert("Limit must be between 1 and 10.");
    }

    setBusy(true);
    try {
      // try a few times to avoid rare code collisions
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();
        const now = new Date();

        const { data, error } = await supabase
          .from("collect_polls")
          .insert({
            code,
            title: t,
            created_at: now.toISOString(),
            // we'll keep collecting until the host finalizes;
            // duration_minutes applies AFTER collection (for the voting poll)
            duration_minutes: parseInt(duration, 10),
            max_options_per_user: limitInt, // NEW
          })
          .select("code")
          .maybeSingle();

        if (!error && data) {
          nav(`/collect/${data.code}`);
          return;
        }
        if (error?.code !== "23505") throw error; // not a unique-violation → bail
      }
      alert("Could not allocate a room code. Please try again.");
    } catch (err) {
      console.error(err);
      alert("Could not create room.");
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What should we do?"
          maxLength={60}
        />

        <label style={{ ...s.label, marginTop: 12 }}>
          Voting Duration (after collection)
        </label>
        <select
          style={s.select}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          <option value="30">30 minutes</option>
          <option value="120">2 hours</option>
          <option value="1440">24 hours</option>
        </select>

        {/* NEW: per-participant option limit */}
        <label style={{ ...s.label, marginTop: 12 }}>
          Max options each participant can add
        </label>
        <select
          style={s.select}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            style={{ ...s.primaryBtn, opacity: busy ? 0.6 : 1 }}
            onClick={createRoom}
            disabled={busy}
          >
            Create Collection Room
          </button>
          <button style={s.secondaryBtn} onClick={() => nav("/")}>Cancel</button>
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
  title: { margin: 0, fontSize: "clamp(22px, 4.5vw, 28px)", textShadow: "0 0 12px rgba(255,140,0,.8)" },
  label: { display: "block", fontWeight: 700, marginBottom: 6 },
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
