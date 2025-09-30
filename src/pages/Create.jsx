// src/pages/Create.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Create() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]); // start with 2 fields
  const [duration, setDuration] = useState("120");  // minutes: 30, 120, 1440

  // ——— helpers ———
  const canAddMore = options.length < 10;
  const trimmed = options.map((o) => o.trim());

  const hasDupes = useMemo(() => {
    const seen = new Set();
    for (const t of trimmed) {
      const k = t.toLowerCase();
      if (!k) continue;
      if (seen.has(k)) return true;
      seen.add(k);
    }
    return false;
  }, [trimmed]);

  const titleTooLong = title.trim().length > 60;
  const optionTooLong = trimmed.some((t) => t.length > 30);
  const tooFew = trimmed.filter(Boolean).length < 2;

  // light “no emoji” guard (surrogate pairs)
  const containsEmoji = (s) => /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(s);
  const hasEmoji = containsEmoji(title) || trimmed.some(containsEmoji);

  // drag & drop
  const [dragIndex, setDragIndex] = useState(null);
  function onDragStart(e, index) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e) {
    e.preventDefault();
  }
  function onDrop(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setOptions((opts) => {
      const next = [...opts];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  function setOptionAt(i, val) {
    setOptions((opts) => {
      const next = [...opts];
      next[i] = val;
      return next;
    });
  }
  function addOption() {
    if (!canAddMore) return;
    setOptions((opts) => [...opts, ""]);
  }
  function removeOption(i) {
    setOptions((opts) => {
      const next = [...opts];
      if (next.length <= 2) return next; // must keep at least 2
      next.splice(i, 1);
      return next;
    });
  }

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function createPoll() {
    const t = title.trim();
    const clean = trimmed.filter(Boolean);
    if (!t) return alert("Please enter a title.");
    if (titleTooLong) return alert("Title must be 60 characters or fewer.");
    if (hasEmoji) return alert("Plain text only (no emojis).");
    if (tooFew) return alert("Please provide at least 2 options.");
    if (optionTooLong) return alert("Each option must be 30 characters or fewer.");
    if (hasDupes) return alert("Duplicate options detected. Please make each option unique.");

    const N = clean.length;
    // Weighted (Steep): 2N, 2N-2, ..., 2
    const pointScheme = Array.from({ length: N }, (_, i) => 2 * (N - i));

    // times
    const now = new Date();
    const ms = parseInt(duration, 10) * 60 * 1000;
    const closesAt = new Date(now.getTime() + ms);
    const expiresAt = new Date(closesAt.getTime() + 24 * 60 * 60 * 1000);

    // try up to 5 codes in case of rare collisions
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { error } = await supabase.from("polls").insert({
        code,
        title: t,
        options: clean,
        point_scheme: pointScheme,
        duration_minutes: parseInt(duration, 10),
        created_at: now.toISOString(),
        closes_at: closesAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        revealed: false,
      });

      if (!error) {
        nav(`/room/${code}`); // Landing page owns the code/copy UI
        return;
      }
      if (error.code !== "23505") {
        console.error(error);
        alert("Could not create poll. Please try again.");
        return;
      }
    }
    alert("Could not allocate a room code. Please try again.");
  }

  const disableCreate =
    !title.trim() ||
    titleTooLong ||
    tooFew ||
    optionTooLong ||
    hasDupes ||
    hasEmoji ||
    trimmed.some((t) => !t); // all visible fields must be non-empty

  return (
    <div className="wrap">
      <div className="col">
        <section className="card section">
          <h1 className="hdr">Create a Poll</h1>

          {/* Title */}
          <label className="label">
            Poll Title <span className="sub">(max 60 chars, plain text)</span>
          </label>
          <label className="field">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Where should we eat dinner?"
              maxLength={60}
            />
          </label>

          {/* Options */}
          <label className="label" style={{ marginTop: 6 }}>
            Options <span className="sub">(2–10, max 30 chars, no duplicates)</span>
          </label>

          <div className="list">
            {options.map((val, i) => (
              <div
                key={i}
                className="option-row"
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, i)}
                title="Drag to reorder"
              >
                <div className="drag-handle" aria-hidden="true">⋮⋮</div>
                <input
                  className="option-input"
                  value={val}
                  onChange={(e) => setOptionAt(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={30}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="icon-btn"
                  disabled={options.length <= 2}
                  title={options.length <= 2 ? "Need at least 2 options" : "Remove option"}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={addOption}
              className={`btn ${canAddMore ? "btn-outline" : ""}`}
              disabled={!canAddMore}
              title={canAddMore ? "Add another option" : "Limit reached (10)"}
            >
              + Add option
            </button>
          </div>

          {/* Duration */}
          <label className="label" style={{ marginTop: 6 }}>
            Duration <span className="sub">(everyone sees a countdown)</span>
          </label>
          <div className="field select-field">
            <select value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="30">30 minutes</option>
              <option value="120">2 hours</option>
              <option value="1440">24 hours</option>
            </select>
            <span className="chev" aria-hidden="true">▾</span>
          </div>

          {/* Notes */}
          <div className="note" style={{ marginTop: 10 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>No emojis allowed; plain text only.</li>
              <li>Poll locks on launch; voters must rank all choices.</li>
              <li>Share the six-character room code with voters.</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="actions">
            <button type="button" className="btn btn-outline" onClick={() => nav("/")}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={createPoll}
              disabled={disableCreate}
              title={disableCreate ? "Complete all fields and fix validation" : "Create & Launch"}
            >
              Create & Launch
            </button>
          </div>
        </section>
      </div>

      <ThemeStyles />
    </div>
  );
}

/** Inline theme so this page matches even without global index.css */
function ThemeStyles() {
  return (
    <style>{`
:root{
  --bg:#0e1116;
  --panel:#1a1f27;
  --ink:#f5efe6;
  --muted:#bfc6d3;
  --accent:#ff8c00;
  --accent-2:#ffb25a;
  --container: min(720px, 94vw);
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

.label{font-weight:800; margin-top:4px}
.sub{font-weight:600; opacity:.7}

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

/* Options list */
.list{ display:grid; gap:10px; margin-top:8px; }
.option-row{
  display:flex; align-items:center; gap:10px; min-width:0;
  padding:10px; border-radius:14px; cursor:grab;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,255,255,.08);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
}
.drag-handle{
  padding:0 8px; user-select:none; font-weight:900;
  color:#ffb25a; text-shadow:0 0 8px rgba(255,140,0,.45);
}
.option-input{
  flex:1; min-width:0;
  background:transparent; border:none; outline:none; color:var(--ink); font-size:1rem;
}
.icon-btn{
  border:1px solid rgba(255,255,255,.18);
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.22));
  color:#c9c9d6;
  border-radius:10px; padding:8px 10px; cursor:pointer;
}
.icon-btn[disabled]{ opacity:.45; cursor:not-allowed }

/* Buttons */
.actions{ display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; }
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

/* Notes / warnings */
.note{
  padding:12px; border-radius:12px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.12));
  border:1px solid rgba(255,140,0,.25);
  box-shadow: 0 0 14px rgba(255,140,0,.10) inset;
  color:#ffdda8; font-weight:600;
}

@media (max-width:600px){ .card{padding:18px} }
    `}</style>
  );
}
