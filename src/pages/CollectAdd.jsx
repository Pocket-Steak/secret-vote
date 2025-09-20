// src/pages/CollectAdd.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ORANGE = "#ff8c00";

/** Stable per-browser token stored in localStorage */
function getClientToken() {
  const KEY = "client_token";
  let t = localStorage.getItem(KEY);
  if (!t) {
    t = Math.random().toString(36).slice(2, 9);
    localStorage.setItem(KEY, t);
  }
  return t;
}

export default function CollectAdd() {
  const nav = useNavigate();
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load poll by code
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collect_polls")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error(error);
          setPoll(null);
        } else {
          setPoll(data);
          const n = Math.min(Math.max(Number(data?.max_per_user) || 3, 1), 10);
          setValues(Array(n).fill(""));
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  // inputs sized to max_per_user (capped 1..10)
  const N = useMemo(
    () => Math.min(Math.max(Number(poll?.max_per_user) || 3, 1), 10),
    [poll?.max_per_user]
  );
  const [values, setValues] = useState([]);

  function setAt(i, val) {
    setValues((arr) => {
      const next = [...arr];
      next[i] = val;
      return next;
    });
  }

  async function submit() {
    if (!poll?.id) return;

    // clean & dedupe
    const cleaned = values.map((s) => (s || "").trim()).filter(Boolean);
    const seen = new Set();
    const unique = [];
    for (const t of cleaned) {
      const k = t.toLowerCase();
      if (!seen.has(k)) { seen.add(k); unique.push(t); }
    }
    if (unique.length === 0) {
      alert("Please enter at least one option.");
      return;
    }

    setSubmitting(true);
    try {
      const author_token = getClientToken();

      // 🔒 Use RPC so author_token is set on the server
      const { error } = await supabase.rpc("collect_add_options", {
        _poll_id: poll.id,
        _author_token: author_token,
        _options: unique,
      });
      if (error) throw error;

      nav(`/collect/${code}`, { state: { added: unique.length } });
    } catch (err) {
      console.error(err);
      alert(`Could not add option(s).\n\n${err?.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return ScreenWrap(
      <div style={s.card}>
        <h1 style={s.title}>Room {code}</h1>
        <p style={{ opacity: 0.8 }}>Loading…</p>
      </div>
    );
  }
  if (!poll) {
    return ScreenWrap(
      <div style={s.card}>
        <h1 style={s.title}>Room {code}</h1>
        <p style={{ opacity: 0.8 }}>
          We couldn’t find this collection room. Double-check the code.
        </p>
        <button style={s.secondaryBtn} onClick={() => nav("/")}>Home</button>
      </div>
    );
  }

  return ScreenWrap(
    <div style={s.card}>
      <div style={s.headerRow}>
        <h1 style={s.title}>{poll.title || "Add Options"}</h1>
        <span style={s.badge}>Code: {code}</span>
      </div>

      <div style={s.helperBox}>
        Add your ideas below. You can add <strong>{N}</strong> {N === 1 ? "option" : "options"}.
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {Array.from({ length: N }).map((_, i) => (
          <input
            key={i}
            value={values[i] || ""}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            maxLength={120}
            style={s.input}
          />
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          style={{ ...s.primaryBtn, opacity: submitting ? 0.7 : 1 }}
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add"}
        </button>
        <button style={s.linkBtn} onClick={() => nav(`/collect/${code}`)}>Back</button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
        Debug: client={getClientToken()} · poll_id={poll.id}
      </div>
    </div>
  );
}

/* ---------- layout helpers / styles ---------- */
function ScreenWrap(children) {
  return <div style={s.wrap}>{children}</div>;
}

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
  card: {
    width: "100%",
    maxWidth: 720,
    padding: "clamp(16px, 3vw, 24px)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 0 20px rgba(255,140,0,.35)",
    boxSizing: "border-box",
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: "clamp(22px, 4.5vw, 28px)", textShadow: "0 0 12px rgba(255,140,0,.8)" },
  badge: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #333",
    background: "#121727",
    letterSpacing: 1,
    fontSize: 12,
  },
  helperBox: {
    marginTop: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,140,0,.25)",
    boxShadow: "0 0 14px rgba(255,140,0,.15) inset",
  },
  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121727",
    color: "#fff",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
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
  linkBtn: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "transparent",
    color: "#aaa",
    cursor: "pointer",
  },
};
