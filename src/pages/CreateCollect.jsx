import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

function genCode(n = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function genAdminKey() {
  return crypto.getRandomValues(new Uint32Array(4)).join("-");
}

export default function CreateCollect() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("120"); // minutes for the later vote
  const [busy, setBusy] = useState(false);

  async function createRoom() {
    const t = title.trim();
    if (!t) return alert("Please enter a title.");
    if (t.length > 60) return alert("Title must be 60 chars or fewer.");

    setBusy(true);
    try {
      const code = genCode();
      const adminKey = genAdminKey();

      // phase='collect' and stash admin_key for the host
      const { error } = await supabase.from("polls").insert({
        code,
        title: t,
        phase: "collect",
        options: [],             // empty for now
        point_scheme: [],        // will be computed later automatically from options count
        duration_minutes: parseInt(duration, 10),
        revealed: false,
        admin_key: adminKey,
      });

      if (error) throw error;

      // save the admin key locally so this browser is the "host"
      localStorage.setItem(`sv_admin_${code}`, adminKey);

      nav(`/collect/${code}`, { state: { justCreated: true } });
    } catch (e) {
      console.error(e);
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
          placeholder="What should we do this weekend?"
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

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
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
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0f17", color: "#e9e9f1", padding: 16 },
  card: { width: "min(720px, 92vw)", padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.04)", boxShadow: "0 0 20px rgba(255,140,0,.35)" },
  title: { fontSize: 26, marginBottom: 10, textShadow: "0 0 12px rgba(255,140,0,.8)" },
  label: { display: "block", fontWeight: 700, marginBottom: 6 },
  input: { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #333", background: "#121727", color: "#fff", outline: "none" },
  select: { width: 220, padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#121727", color: "#fff", outline: "none" },
  primaryBtn: { padding: "12px 18px", borderRadius: 12, border: "none", background: ORANGE, color: "#000", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 14px rgba(255,140,0,.8)" },
  secondaryBtn: { padding: "12px 16px", borderRadius: 12, border: `1px solid ${ORANGE}`, background: "transparent", color: ORANGE, cursor: "pointer" },
};
