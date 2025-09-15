// src/pages/Create.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import { supabase } from "../lib/supabase";

// ====== GitHub Pages URL helper =============================================
// BASE_PATH is injected by the GitHub Actions workflow.
// In prod it's "/<REPO-NAME>/" and locally it's just "/".
const BASE_PATH = (import.meta.env.BASE_PATH || "/").replace(/\/+$/, "/");

/** Build an absolute URL that works on GitHub Pages project sites. */
const makeHashUrl = (hashPath) => {
  const clean = String(hashPath).replace(/^#?\/?/, "");
  return `${window.location.origin}${BASE_PATH}#/${clean}`;
};
// ============================================================================

// --- constants (theme + limits) ---------------------------------------------
const ORANGE = "#ff8c00";
const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

const DURATIONS = [
  { label: "30 minutes", mins: 30 },
  { label: "2 hours", mins: 120 },
  { label: "24 hours", mins: 1440 },
];

// --- helpers ----------------------------------------------------------------
const genCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
};

const nowPlus = (mins) => new Date(Date.now() + mins * 60_000);
const toIso = (d) => d.toISOString();

// --- component --------------------------------------------------------------
export default function Create() {
  // form state
  const [title, setTitle] = useState("Where should we eat dinner?");
  const [duration, setDuration] = useState(DURATIONS[1]); // default 2h
  const [options, setOptions] = useState(["Pizza", "Burgers"]); // start with two visible
  const [newOpt, setNewOpt] = useState("");

  // after-create state
  const [roomCode, setRoomCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // share URLs + QR
  const voteUrl = useMemo(
    () => (roomCode ? makeHashUrl(`vote/${roomCode}`) : ""),
    [roomCode],
  );
  const resultsUrl = useMemo(
    () => (roomCode ? makeHashUrl(`results/${roomCode}`) : ""),
    [roomCode],
  );
  const qrRef = useRef(null);

  useEffect(() => {
    if (!voteUrl || !qrRef.current) return;
    QRCode.toCanvas(qrRef.current, voteUrl, { width: 260, margin: 1, errorCorrectionLevel: "M" });
  }, [voteUrl]);

  // countdown for UI
  const [tock, setTock] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setTock((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const remaining = useMemo(() => {
    if (!expiresAt) return "";
    const ms = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${h}h ${m}m ${s}s`;
  }, [expiresAt, tock]);

  // form handlers
  const addOption = () => {
    const v = newOpt.trim();
    if (!v) return;
    if (options.length >= MAX_OPTIONS) return;
    if (options.some((o) => o.toLowerCase() === v.toLowerCase())) return;
    setOptions((prev) => [...prev, v]);
    setNewOpt("");
  };

  const removeOption = (idx) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const move = (from, to) => {
    setOptions((prev) => {
      const copy = [...prev];
      const [it] = copy.splice(from, 1);
      copy.splice(to, 0, it);
      return copy;
    });
  };

  // create room in Supabase
  const onCreate = async () => {
    setError("");
    if (options.length < MIN_OPTIONS) {
      setError(`Add at least ${MIN_OPTIONS} options.`);
      return;
    }
    if (options.length > MAX_OPTIONS) {
      setError(`Max ${MAX_OPTIONS} options.`);
      return;
    }

    setCreating(true);
    try {
      // 1) create room
      const code = genCode();
      const expires = nowPlus(duration.mins);

      const { error: roomErr } = await supabase.from("rooms").insert([
        {
          code,
          title: title.trim(),
          expires_at: toIso(expires),
        },
      ]);
      if (roomErr) throw roomErr;

      // 2) insert options
      const rows = options.map((text, idx) => ({
        room_code: code,
        text: text.trim(),
        idx,
      }));
      const { error: optErr } = await supabase.from("options").insert(rows);
      if (optErr) throw optErr;

      setRoomCode(code);
      setExpiresAt(expires.toISOString());
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to create poll");
    } finally {
      setCreating(false);
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `vote-${roomCode}.png`;
    link.click();
  };

  // --- UI -------------------------------------------------------------------
  return (
    <div style={styles.page}>
      {!roomCode ? (
        <div style={styles.card}>
          <h1 style={styles.h1}>Create a Poll</h1>

          <label style={styles.label}>
            Poll Title <span style={styles.hint}>(max 60 chars, plain text)</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            placeholder="Where should we eat dinner?"
            style={styles.input}
          />

          <div style={{ height: 16 }} />

          <label style={styles.label}>
            Options{" "}
            <span style={styles.hint}>
              ({MIN_OPTIONS}–{MAX_OPTIONS}, max 30 chars, no duplicates)
            </span>
          </label>

          <div style={{ marginBottom: 8 }}>
            {options.map((opt, i) => (
              <div key={i} style={styles.optionRow}>
                <span style={styles.badge}>{i + 1}</span>
                <input
                  value={opt}
                  onChange={(e) =>
                    setOptions((prev) => {
                      const copy = [...prev];
                      copy[i] = e.target.value.slice(0, 30);
                      return copy;
                    })
                  }
                  style={styles.optInput}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    style={styles.smallBtn}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    style={styles.smallBtn}
                    disabled={i === options.length - 1}
                    onClick={() => move(i, i + 1)}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    style={styles.smallBtn}
                    onClick={() => removeOption(i)}
                    disabled={options.length <= MIN_OPTIONS}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {options.length < MAX_OPTIONS && (
            <div style={styles.addRow}>
              <input
                value={newOpt}
                onChange={(e) => setNewOpt(e.target.value.slice(0, 30))}
                placeholder="Add another option"
                style={styles.optInput}
              />
              <button style={styles.primaryBtn} onClick={addOption}>
                Add
              </button>
            </div>
          )}

          <div style={{ height: 16 }} />

          <label style={styles.label}>Voting window</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DURATIONS.map((d) => (
              <button
                key={d.mins}
                style={d.mins === duration.mins ? styles.primaryBtn : styles.secondaryBtn}
                onClick={() => setDuration(d)}
              >
                {d.label}
              </button>
            ))}
          </div>

          {!!error && <div style={styles.error}>{error}</div>}

          <div style={{ height: 18 }} />
          <button style={styles.primaryBtn} onClick={onCreate} disabled={creating}>
            {creating ? "Creating…" : "Create & Launch Poll"}
          </button>
        </div>
      ) : (
        <div style={styles.card}>
          <h1 style={styles.h1}>Poll launched!</h1>
          <p style={styles.subtitle}>Share the QR or links below so people can vote or see live results.</p>

          <div style={styles.shareRow}>
            <div>
              <div style={styles.codePill}>
                <span style={{ opacity: 0.8 }}>Code:</span> <b>{roomCode}</b>
              </div>
              <div style={styles.timer}>
                Ends in <b>{remaining}</b>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <a href={voteUrl} style={styles.primaryBtn}>Vote</a>
                <a href={resultsUrl} style={styles.secondaryBtn}>View Results</a>
                <button style={styles.secondaryBtn} onClick={downloadQR}>
                  Download QR (PNG)
                </button>
              </div>

              <div style={{ marginTop: 8, opacity: 0.8 }}>
                Share the QR or code so people can vote or see live results.
              </div>
            </div>

            <div style={styles.qrWrap}>
              <canvas ref={qrRef} />
              <div style={{ marginTop: 8, textAlign: "center", opacity: 0.9 }}>{voteUrl}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- styles (neon orange / modern / crisp) ----------------------------------
const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 800px at 20% -20%, rgba(255,140,0,0.09), transparent 60%), #0c0f14",
    color: "#eaeef7",
    padding: "40px 20px",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "min(960px, 100%)",
    background: "rgba(16,20,26,0.85)",
    borderRadius: 16,
    padding: 24,
    boxShadow: `0 0 0 1px rgba(255,140,0,0.25), 0 20px 40px rgba(0,0,0,0.5)`,
  },
  h1: {
    margin: "0 0 12px 0",
    fontSize: 28,
    letterSpacing: 0.3,
    textShadow: `0 0 18px rgba(255,140,0,0.35)`,
  },
  subtitle: { marginTop: -6, opacity: 0.85 },

  label: { display: "block", margin: "18px 0 8px 2px", fontWeight: 600 },
  hint: { opacity: 0.6, fontWeight: 400 },

  input: {
    width: "100%",
    padding: "14px 16px",
    background: "#0f1319",
    border: "1px solid rgba(255,140,0,0.35)",
    borderRadius: 12,
    outline: "none",
    color: "#fff",
    boxShadow: "inset 0 0 20px rgba(255,140,0,0.07)",
  },

  optionRow: {
    display: "grid",
    gridTemplateColumns: "40px 1fr auto",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    display: "inline-block",
    width: 36,
    height: 36,
    borderRadius: 10,
    lineHeight: "36px",
    textAlign: "center",
    background: "rgba(255,140,0,0.1)",
    border: "1px solid rgba(255,140,0,0.35)",
    color: "#ffd9b3",
    fontWeight: 700,
  },
  optInput: {
    width: "100%",
    padding: "10px 12px",
    background: "#0f1319",
    border: "1px solid rgba(255,140,0,0.35)",
    borderRadius: 10,
    outline: "none",
    color: "#fff",
  },
  addRow: { display: "flex", gap: 8, marginTop: 6 },

  primaryBtn: {
    background: ORANGE,
    color: "#0b0f14",
    border: "none",
    borderRadius: 12,
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "0 0 16px rgba(255,140,0,0.5)",
  },
  secondaryBtn: {
    background: "transparent",
    color: "#ffd9b3",
    border: "1px solid rgba(255,140,0,0.5)",
    borderRadius: 12,
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "0 0 16px rgba(255,140,0,0.25) inset",
  },
  smallBtn: {
    background: "transparent",
    color: "#ffd9b3",
    border: "1px solid rgba(255,140,0,0.5)",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 700,
  },

  error: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(255,77,77,0.12)",
    border: "1px solid rgba(255,77,77,0.35)",
    color: "#ffb3b3",
  },

  shareRow: {
    display: "grid",
    gridTemplateColumns: "1fr 280px",
    gap: 20,
    alignItems: "start",
  },
  codePill: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,140,0,0.5)",
    background: "rgba(255,140,0,0.06)",
    color: "#ffe3c2",
  },
  timer: {
    marginTop: 8,
    opacity: 0.9,
  },
  qrWrap: {
    justifySelf: "end",
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,140,0,0.06)",
    border: "1px solid rgba(255,140,0,0.35)",
    boxShadow: "0 0 24px rgba(255,140,0,0.18)",
  },
};
