// src/pages/CreateCollect.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

function genCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export default function CreateCollect() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState(120);
  const [maxPerUser, setMaxPerUser] = useState(3);
  const [targetHint, setTargetHint] = useState("");
  const [hostPin, setHostPin] = useState("");     // now REQUIRED
  const [submitting, setSubmitting] = useState(false);

  const durations = useMemo(
    () => [
      { label: "30 minutes", minutes: 30 },
      { label: "1 hour", minutes: 60 },
      { label: "2 hours", minutes: 120 },
      { label: "4 hours", minutes: 240 },
      { label: "8 hours", minutes: 480 },
    ],
    []
  );

  const maxChoices = useMemo(() => [1, 2, 3, 4, 5, 6], []);

  async function handleCreate() {
    const t = title.trim();
    if (!t) {
      alert("Please enter a poll title.");
      return;
    }

    // 🔒 Host PIN is REQUIRED and must be 4+ digits
    const pin = hostPin.trim();
    if (!/^\d{4,}$/.test(pin)) {
      alert("Host PIN is required and must be at least 4 digits (numbers only).");
      return;
    }

    // Target participants is optional number
    let target = null;
    if (targetHint.trim()) {
      const n = Number(targetHint);
      if (!Number.isFinite(n) || n < 1 || n > 1000000) {
        alert("Target participants should be a positive number.");
        return;
      }
      target = Math.floor(n);
    }

    setSubmitting(true);
    try {
      const code = genCode();
      const duration = Number(durationMin);
      const maxAdded = Number(maxPerUser);

      const payload = {
        code,
        title: t,
        duration_minutes: duration,
        max_per_user: maxAdded,
        target_participants_hint: target, // nullable
        host_pin: pin,                     // ✅ REQUIRED (no null)
        status: "collecting",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("collect_polls").insert(payload);

      if (error) {
        console.error(error);
        alert(`Could not create room.\n\n${error.message || ""}`);
        setSubmitting(false);
        return;
      }

      nav(`/collect/${code}`);
    } catch (err) {
      console.error(err);
      alert("Unexpected error creating the room.");
      setSubmitting(false);
    }
  }

  const pinValid = /^\d{4,}$/.test(hostPin.trim());

  return (
    <div style={s.wrap}>
      <div style={s.container}>
        <h1 style={s.title}>Collect Options First</h1>

        {/* Poll Title */}
        <label style={s.label}>Poll Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What should we do?"
          style={s.input}
          maxLength={60}
        />

        {/* Voting Duration */}
        <label style={s.label}>Voting Duration (after collection)</label>
        <div style={s.selectWrap}>
          <select
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            style={s.select}
          >
            {durations.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.label}
              </option>
            ))}
          </select>
          <span style={s.chev}>▾</span>
        </div>

        {/* Max options per participant */}
        <label style={s.label}>Max options each participant can add</label>
        <div style={s.selectWrap}>
          <select
            value={maxPerUser}
            onChange={(e) => setMaxPerUser(Number(e.target.value))}
            style={s.select}
          >
            {maxChoices.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span style={s.chev}>▾</span>
        </div>

        {/* Target participants hint (optional) */}
        <label style={s.label}>Target participants (optional)</label>
        <input
          value={targetHint}
          onChange={(e) => setTargetHint(e.target.value)}
          placeholder="e.g., 6"
          inputMode="numeric"
          style={s.input}
        />

        {/* Host PIN (REQUIRED) */}
        <label style={s.label}>
          Host PIN <span style={{ color: ORANGE }}>(4+ digits)</span>
        </label>
        <input
          value={hostPin}
          onChange={(e) => setHostPin(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Enter a PIN to control opening voting"
          inputMode="numeric"
          style={{
            ...s.input,
            borderColor: hostPin.length === 0 || pinValid ? "#333" : "#c0392b",
          }}
          maxLength={12}
        />
        {hostPin && !pinValid && (
          <div style={{ color: "#ff6b6b", marginTop: 6, fontSize: 12 }}>
            PIN must be at least 4 digits.
          </div>
        )}

        {/* Actions */}
        <div style={s.actions}>
          <button
            style={{ ...s.primaryBtn, opacity: submitting || !pinValid ? 0.6 : 1 }}
            disabled={submitting || !pinValid}
            onClick={handleCreate}
          >
            {submitting ? "Creating…" : "Create Collection Room"}
          </button>
          <button style={s.secondaryBtn} onClick={() => nav("/")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- styles (unchanged) ---------- */
const s = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
    overflowX: "hidden",
  },
  container: {
    width: "100%",
    maxWidth: 900,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    marginBottom: 10,
    fontSize: "clamp(22px, 4.5vw, 28px)",
    textShadow: "0 0 12px rgba(255,140,0,.8)",
  },
  label: {
    display: "block",
    marginTop: 14,
    marginBottom: 6,
    fontWeight: 700,
  },
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
  selectWrap: {
    position: "relative",
    display: "inline-block",
    width: "100%",
  },
  select: {
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    width: "100%",
    padding: "12px 40px 12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  chev: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    opacity: 0.7,
  },
  actions: {
    marginTop: 18,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
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
