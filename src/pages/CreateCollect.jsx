// src/pages/CreateCollect.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

        <p className="help" style={{ marginTop: 8 }}>
          Debug: this device token is stored locally for testing.
        </p>
      </div>

      {/* Self-contained theme (works even if index.css wasn't loaded) */}
      <style>{`
:root{
  --bg:#0e1116;
  --panel:#1a1f27;
  --ink:#f5efe6;
  --muted:#bfc6d3;
  --accent:#ff8c00;
  --accent-2:#ffb25a;
  --container: min(520px, 92vw);
}

*{box-sizing:border-box}
html,body,#root{min-height:100%}
body{margin:0; background: var(--bg);}

.wrap{
  min-height:100vh; min-height:100svh; min-height:100dvh;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  padding: max(16px, env(safe-area-inset-top)) 18px max(16px, env(safe-area-inset-bottom));
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(255,140,0,.08), transparent 60%),
    radial-gradient(800px 400px at 100% 0%, rgba(255,140,0,.05), transparent 60%),
    var(--bg);
  color:var(--ink);
}

.col{ display:flex; flex-direction:column; align-items:center; gap:16px; width:var(--container); }

.card{
  width:100%;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.08)), var(--panel);
  border:1px solid rgba(255,255,255,.06);
  border-radius:16px; padding:24px;
  box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 10px 24px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.25);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.card:hover{
  transform: translateY(-2px);
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 14px 32px rgba(0,0,0,.45), 0 3px 10px rgba(0,0,0,.3);
  border-color: rgba(255,140,0,.25);
}

.hdr{font-size:1.35rem;font-weight:800;letter-spacing:.2px;margin:0 0 10px;text-shadow:0 1px 0 rgba(0,0,0,.5)}
.help{color:var(--muted);font-size:.95rem;margin:.25rem 0 0}
.stack{display:flex;flex-direction:column;gap:16px}
.section{margin:4px 0 6px}

.label{font-weight:700; margin-top:4px}

/* Field shell shared with inputs & selects */
.field{
  display:flex; align-items:center; gap:10px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.15));
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px; padding:14px 16px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
}
.field:focus-within{
  border-color: rgba(255,140,0,.45);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(255,140,0,.18);
}
.field.invalid{ border-color:#c0392b; }

.field input{
  width:100%; background:transparent; border:none; outline:none;
  color:var(--ink); font-size:1.05rem; letter-spacing:.02em;
}

/* Selects sit inside the field shell too */
.select-field{ position:relative; }
.select-field select{
  appearance:none; -webkit-appearance:none; -moz-appearance:none;
  width:100%; background:transparent; border:none; outline:none;
  color:var(--ink); font-size:1.05rem; line-height:1.2;
}
.select-field .chev{
  position:absolute; right:12px; top:50%; transform:translateY(-50%); opacity:.8; pointer-events:none;
}

/* Buttons */
.btn{
  appearance:none; border:none; cursor:pointer; font-weight:800;
  border-radius:14px; padding:14px 18px; width:100%;
  transition: transform .08s ease, box-shadow .12s ease, filter .12s ease, opacity .12s ease;
}
.btn[disabled]{opacity:.7; cursor:not-allowed}
.btn-primary{
  color:#1a1005;
  background: linear-gradient(180deg, var(--accent-2), var(--accent));
  box-shadow: 0 10px 18px rgba(255,140,0,.28), 0 2px 0 rgba(255,140,0,.9) inset, 0 1px 0 rgba(255,255,255,.35) inset;
}
.btn-primary:hover{ filter:brightness(1.05) }
.btn-primary:active{
  transform: translateY(1px);
  box-shadow: 0 6px 12px rgba(255,140,0,.24), 0 1px 0 rgba(140,70,0,.9) inset, 0 0 0 rgba(255,255,255,0) inset;
}
.btn-outline{
  color:var(--accent-2);
  background: linear-gradient(180deg, rgba(255,140,0,.08), rgba(255,140,0,.04));
  border:1px solid rgba(255,140,0,.45);
  box-shadow: 0 6px 14px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.04) inset;
}
.btn-outline:hover{
  background: linear-gradient(180deg, rgba(255,140,0,.14), rgba(255,140,0,.06));
}

.error{ color:#ff6b6b; font-size:.9rem; margin:-6px 0 6px }
@media (max-width:600px){ .card{padding:18px} }
      `}</style>
    </div>
  );
}
