// src/pages/CreateCollect.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

// 6-char room code helper (A–Z0–9)
function makeCode(n = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusables
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function CreateCollect() {
  const nav = useNavigate();

  // form state
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(120); // minutes
  const [maxPerUser, setMaxPerUser] = useState(3);
  const [target, setTarget] = useState(""); // optional number
  const [hostPin, setHostPin] = useState(""); // NEW
  const [busy, setBusy] = useState(false);
  const [debug, setDebug] = useState("");

  async function handleCreate() {
    if (!title.trim()) {
      alert("Please enter a poll title.");
      return;
    }
    setBusy(true);
    setDebug("");

    const code = makeCode();

    // payload for collect_polls
    const payload = {
      code,
      title: title.trim(),
      max_per_user: maxPerUser,
      voting_duration_minutes: Number(duration),
      created_at: new Date().toISOString(),
      target_participants_hint: target ? Number(target) : null,
      // status defaults server-side to 'collecting' if you added that default,
      // otherwise it will just be null and can be set later by RPCs.
    };

    try {
      // 1) create collection room
      const { data: row, error } = await supabase
        .from("collect_polls")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        console.error(error);
        alert(`Could not create room.\n\n${error.message}`);
        setBusy(false);
        return;
      }

      // 2) if host provided a PIN, set it via RPC
      if (hostPin.trim()) {
        const { error: pinErr } = await supabase.rpc("collect_set_pin", {
          _code: code,
          _pin: hostPin.trim(),
        });
        if (pinErr) {
          console.error(pinErr);
          alert(`Room was created, but could not set the host PIN.\n\n${pinErr.message}`);
          // continue anyway — host page will still work without PIN
        }
      }

      // 3) go to the collection room for participants to add options
      nav(`/collect/${code}`);
    } catch (e) {
      console.error(e);
      alert("Could not create room.");
    } finally {
      setDebug(JSON.stringify(payload));
      setBusy(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h1 style={s.title}>Collect Options First</h1>

        {/* Poll Title */}
        <label style={s.label}>Poll Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What should we do?"
          style={s.input}
        />

        {/* Voting duration */}
        <label style={s.label}>Voting Duration (after collection)</label>
        <select value={duration} onChange={(e) => setDuration(e.target.value)} style={s.select}>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={180}>3 hours</option>
          <option value={240}>4 hours</option>
          <option value={480}>8 hours</option>
        </select>

        {/* Max options each participant can add */}
        <label style={s.label}>Max options each participant can add</label>
        <select
          value={maxPerUser}
          onChange={(e) => setMaxPerUser(Number(e.target.value))}
          style={s.select}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        {/* Target participants (optional) */}
        <label style={s.label}>Target participants (optional)</label>
        <input
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="e.g., 6"
          style={s.input}
        />

        {/* NEW: Host PIN (optional) */}
        <label style={s.label}>Host PIN (optional)</label>
        <input
          value={hostPin}
          onChange={(e) => setHostPin(e.target.value)}
          placeholder="Set a PIN to open voting later"
          style={s.input}
        />

        <div style={s.actions}>
          <button style={s.primaryBtn} onClick={handleCreate} disabled={busy}>
            {busy ? "Creating…" : "Create Collection Room"}
          </button>
          <button style={s.secondaryBtn} onClick={() => history.back()} disabled={busy}>
            Cancel
          </button>
        </div>

        {/* Debug box (optional) */}
        {debug && (
          <div style={s.debug}>
            <div>Payload:</div>
            <pre style={{ margin: 0 }}>{debug}</pre>
          </div>
        )}
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
    width: "min(900px, 94vw)",
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
  label: { marginTop: 14, marginBottom: 6, fontWeight: 700, color: "#ffd9b3" },
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
    boxSizing: "border-box",
  },
  actions: { display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" },
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
  debug: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #333",
    background: "#0e1423",
    fontSize: 12,
    color: "#aaa",
  },
};
