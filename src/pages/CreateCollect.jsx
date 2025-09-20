// src/pages/CreateCollect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CreateCollect() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState(120);
  const [maxPerUser, setMaxPerUser] = useState(3);
  const [targetHint, setTargetHint] = useState("");

  async function createRoom() {
    const code = makeCode();
    const payload = {
      code,
      title: title.trim(),
      voting_duration_minutes: Number(durationMin) || 120,
      max_per_user: Number(maxPerUser) || 1,
      target_participants_hint: targetHint ? Number(targetHint) : null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("collect_polls").insert(payload);
    if (error) {
      alert(`Could not create room.\n\n${error.message}`);
      return;
    }
    // Send a flag so the room can prompt host to set a PIN once
    nav(`/collect/${code}`, { state: { askSetPin: true } });
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h1 style={s.title}>Collect Options First</h1>

        <label style={s.label}>Poll Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What should we do?"
          style={s.input}
        />

        <div style={s.grid2}>
          <div>
            <label style={s.label}>Voting Duration (after collection)</label>
            <select
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              style={s.select}
            >
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>1 day</option>
            </select>
          </div>

          <div>
            <label style={s.label}>Max options each participant can add</label>
            <select
              value={maxPerUser}
              onChange={(e) => setMaxPerUser(e.target.value)}
              style={s.select}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label style={s.label}>Target participants (optional)</label>
        <input
          value={targetHint}
          onChange={(e) => setTargetHint(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g., 5"
          style={s.input}
        />

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={s.primaryBtn} onClick={createRoom}>
            Create Collection Room
          </button>
          <button style={s.secondaryBtn} onClick={() => history.back()}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function makeCode() {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

const s = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px,2vw,16px)",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    padding: "clamp(16px,3vw,24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    fontSize: "clamp(24px,4.5vw,30px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
  },
  label: { display: "block", marginTop: 14, marginBottom: 6, fontWeight: 700 },
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
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
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
