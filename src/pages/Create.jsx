import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

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
  function onDragOver(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
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
    <div style={styles.wrap}>
      <div style={styles.container}>
        <h1 style={styles.title}>Create a Poll</h1>

        {/* Title */}
        <label style={styles.label}>
          Poll Title <span style={styles.sub}>(max 60 chars, plain text)</span>
        </label>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Where should we eat dinner?"
          maxLength={60}
        />

        {/* Options */}
        <label style={{ ...styles.label, marginTop: 16 }}>
          Options <span style={styles.sub}>(2–10, max 30 chars, no duplicates)</span>
        </label>

        <div style={styles.list}>
          {options.map((val, i) => (
            <div
              key={i}
              style={styles.optionRow}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              title="Drag to reorder"
            >
              <div style={styles.dragHandle}>::</div>
              <input
                style={styles.optionInput}
                value={val}
                onChange={(e) => setOptionAt(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                maxLength={30}
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                style={{ ...styles.iconBtn, opacity: options.length <= 2 ? 0.4 : 1 }}
                disabled={options.length <= 2}
                title={options.length <= 2 ? "Need at least 2 options" : "Remove option"}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={addOption}
            style={{ ...styles.ghostBtn, opacity: canAddMore ? 1 : 0.4 }}
            disabled={!canAddMore}
          >
            + Add option
          </button>
        </div>

        {/* Duration */}
        <label style={{ ...styles.label, marginTop: 16 }}>
          Duration <span style={styles.sub}>(everyone sees a countdown)</span>
        </label>
        <select
          style={styles.select}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          <option value="30">30 minutes</option>
          <option value="120">2 hours</option>
          <option value="1440">24 hours</option>
        </select>

        {/* Notes */}
        <div style={styles.warnBox}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>No emojis allowed; plain text only.</li>
            <li>Poll locks on launch; voters must rank all choices.</li>
            <li>Share the six-character room code with voters.</li>
          </ul>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={() => nav("/")} style={styles.secondaryBtn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={createPoll}
            style={{ ...styles.primaryBtn, opacity: disableCreate ? 0.6 : 1 }}
            disabled={disableCreate}
            title={disableCreate ? "Complete all fields and fix validation" : "Create & Launch"}
          >
            Create & Launch
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0f17",
    color: "#e9e9f1",
    padding: "clamp(8px, 2vw, 16px)",
    overflowX: "hidden", // kill stray horizontal scroll on mobile
  },
  container: {
    width: "100%",
    maxWidth: 720,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
    margin: "0 auto",
  },
  title: { fontSize: "clamp(22px, 4.5vw, 28px)", marginBottom: 10, textShadow: "0 0 12px rgba(255,140,0,.8)" },

  label: { display: "block", fontWeight: 700, marginBottom: 6, fontSize: "clamp(14px, 3.6vw, 18px)" },
  sub: { fontWeight: 400, opacity: 0.7 },

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

  list: { display: "grid", gap: 8, marginTop: 8 },

  optionRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid #222",
  },
  dragHandle: {
    cursor: "grab",
    userSelect: "none",
    padding: "0 8px",
    color: ORANGE,
    textShadow: "0 0 8px rgba(255,140,0,.7)",
  },
  optionInput: {
    flex: 1,
    width: "100%",
    minWidth: 0, // prevents overflow in flex rows on iOS
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "#0e1424",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  iconBtn: {
    border: "1px solid #333",
    background: "transparent",
    color: "#bbb",
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer",
    flex: "0 0 auto",
  },

  ghostBtn: {
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
  },

  select: {
    width: "100%",          // full width on mobile
    maxWidth: 340,          // but don’t get huge on desktop
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },

  warnBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,140,0,.07)",
    border: `1px solid rgba(255,140,0,.4)`,
    color: "#ffd9b3",
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
    flex: "0 0 auto",
  },
  secondaryBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${ORANGE}`,
    background: "transparent",
    color: ORANGE,
    cursor: "pointer",
    flex: "0 0 auto",
  },
};
