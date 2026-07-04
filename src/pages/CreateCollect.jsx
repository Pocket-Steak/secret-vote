// src/pages/CreateCollect.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { narrowTheme } from "../lib/theme.js";

function ThemeStyles() { return <style>{narrowTheme}</style>; }

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
  const [hostPin, setHostPin] = useState(""); // REQUIRED
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

  async function handleCreate(e) {
    e?.preventDefault?.();

    const t = title.trim();
    if (!t) {
      alert("Please enter a poll title.");
      return;
    }

    const pin = hostPin.trim();
    if (!/^\d{4,}$/.test(pin)) {
      alert("Host PIN is required and must be at least 4 digits (numbers only).");
      return;
    }

    let target = null;
    if (targetHint.trim()) {
      const n = Number(targetHint);
      if (!Number.isFinite(n) || n < 1 || n > 1_000_000) {
        alert("Target participants should be a positive number.");
        return;
      }
      target = Math.floor(n);
    }

    setSubmitting(true);
    try {
      const code = genCode();
      const payload = {
        code,
        title: t,
        duration_minutes: Number(durationMin),
        max_per_user: Number(maxPerUser),
        target_participants_hint: target,
        host_pin: pin,
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
    <div className="wrap">
      <div className="col">
        <section className="card section">
          <h1 className="hdr">Collect Options First</h1>
          <p className="help">
            Create a room to collect ideas from the group, then open voting when you’re ready.
          </p>

          <form className="stack" onSubmit={handleCreate}>
            {/* Poll Title */}
            <label className="label">Poll Title</label>
            <label className="field">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What should we do?"
                maxLength={60}
              />
            </label>

            {/* Voting Duration */}
            <label className="label">Voting Duration (after collection)</label>
            <div className="field select-field">
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              >
                {durations.map((d) => (
                  <option key={d.minutes} value={d.minutes}>
                    {d.label}
                  </option>
                ))}
              </select>
              <span className="chev" aria-hidden="true">▾</span>
            </div>

            {/* Max options per participant */}
            <label className="label">Max options each participant can add</label>
            <div className="field select-field">
              <select
                value={maxPerUser}
                onChange={(e) => setMaxPerUser(Number(e.target.value))}
              >
                {maxChoices.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="chev" aria-hidden="true">▾</span>
            </div>

            {/* Target participants hint (optional) */}
            <label className="label">Target participants (optional)</label>
            <label className="field">
              <input
                value={targetHint}
                onChange={(e) => setTargetHint(e.target.value)}
                placeholder="e.g., 6"
                inputMode="numeric"
              />
            </label>

            {/* Host PIN (REQUIRED) */}
            <label className="label">
              Host PIN <span style={{ color: "var(--accent)" }}>(4+ digits)</span>
            </label>
            <label className={`field ${hostPin && !pinValid ? "invalid" : ""}`}>
              <input
                value={hostPin}
                onChange={(e) => setHostPin(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Enter a PIN to control opening voting"
                inputMode="numeric"
                maxLength={12}
              />
            </label>
            {hostPin && !pinValid && (
              <p className="error">PIN must be at least 4 digits.</p>
            )}

            {/* Actions */}
            <button type="submit" className="btn btn-primary" disabled={submitting || !pinValid}>
              {submitting ? "Creating…" : "Create Collection Room"}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => nav("/")}>
              Cancel
            </button>
          </form>
        </section>
      </div>

      <ThemeStyles />
    </div>
  );
}
