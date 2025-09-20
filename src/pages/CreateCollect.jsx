// src/pages/CreateCollect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

export default function CreateCollect() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("120");      // minutes for voting after finalize
  const [maxPerUser, setMaxPerUser] = useState(3);      // how many options each person can add
  const [targetPeople, setTargetPeople] = useState(""); // optional hint only

  function generateCode(len = 6) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[(Math.random() * chars.length) | 0];
    return s;
  }

  async function createRoom() {
    const t = title.trim();
    if (!t) return alert("Please enter a poll title.");
    if (maxPerUser < 1 || maxPerUser > 10) return alert("Max options per participant must be 1–10.");

    // admin_key lets the host finalize later
    const adminKey = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const code = generateCode();

    // create the collection poll row
    const { error } = await supabase.from("collect_polls").insert({
      code,
      title: t,
      max_per_user: maxPerUser,
      admin_key: adminKey,
      voting_duration_minutes: parseInt(duration, 10),
      target_participants_hint: targetPeople ? parseInt(targetPeople, 10) : null, // optional
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      alert("Could not create room.");
      return;
    }

    // Remember admin key locally so the host sees the finalize button
    localStorage.setItem(`collect-admin-${code}`, adminKey);

    nav(`/collect/${code}`);
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
          maxLength={80}
        />

        <label style={{ ...s.label, marginTop: 12 }}>
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

        <label style={{ ...s.label, marginTop: 12 }}>
          Max options each participant can add
        </label>
        <select
          value={maxPerUser}
          onChange={(e) => setMaxPerUser(parseInt(e.target.value, 10))}
          style={s.select}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <label style={{ ...s.label, marginTop: 12 }}>
          Target participants (optional)
        </label>
        <input
          value={targetPeople}
          onChange={(e) => setTargetPeople(e.target.value.replace(/\D+/g, ""))}
          placeholder="e.g., 6"
          style={s.input}
          inputMode="numeric"
        />

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button style={s.primaryBtn} onClick={createRoom}>
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
    padding: "clamp(8px,2vw,16px)",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    padding: 24,
    borderRadius: 16,
    background: "rgba(255,255,255,.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
  },
  title: { margin: 0, fontSize: "clamp(22px,4.5vw,28px)", textShadow: "0 0 12px rgba(255,140,0,.8)" },
  label: { fontWeight: 700, marginBottom: 6 },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #333",
    background: "#121727", color: "#fff", outline: "none", boxSizing: "border-box"
  },
  select: {
    width: 220, padding: "10px 12px", borderRadius: 12, border: "1px solid #333",
    background: "#121727", color: "#fff", outline: "none"
  },
  primaryBtn: {
    padding: "12px 18px", borderRadius: 12, border: "none",
    background: ORANGE, color: "#000", fontWeight: 800, cursor: "pointer",
    boxShadow: "0 0 14px rgba(255,140,0,.8)"
  },
  secondaryBtn: {
    padding: "12px 16px", borderRadius: 12, border: `1px solid ${ORANGE}`,
    background: "transparent", color: ORANGE, cursor: "pointer"
  },
};
